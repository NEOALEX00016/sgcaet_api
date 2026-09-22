import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FormularioVersionesService } from './formulario-versiones.service';
import { FormularioVersione } from './entities/formulario-versione.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FormularioVersionesService', () => {
  let service: FormularioVersionesService;
  const versionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const formulariosRepositoryMock = { findOne: jest.fn() };
  const camposRepositoryMock = { find: jest.fn() };
  const reglasRepositoryMock = { find: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormularioVersionesService,
        {
          provide: getRepositoryToken(FormularioVersione),
          useValue: versionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Formulario),
          useValue: formulariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioCampo),
          useValue: camposRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioRegla),
          useValue: reglasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<FormularioVersionesService>(
      FormularioVersionesService,
    );
    jest.resetAllMocks();
  });

  it('crea version en borrador y registra bitacora', async () => {
    formulariosRepositoryMock.findOne.mockResolvedValue({
      id: 'form-1',
      empresaId: user.empresaId,
    });
    versionesRepositoryMock.findOne
      .mockResolvedValueOnce({ versionNumero: 1 })
      .mockResolvedValueOnce(null);
    versionesRepositoryMock.create.mockReturnValue({
      id: 'ver-2',
      formularioId: 'form-1',
      empresaId: user.empresaId,
      versionNumero: 2,
      estado: 'borrador',
    });
    versionesRepositoryMock.save.mockResolvedValue({
      id: 'ver-2',
      formularioId: 'form-1',
      empresaId: user.empresaId,
      versionNumero: 2,
      estado: 'borrador',
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(
      {
        formularioId: 'form-1',
        plantillaHtml: '<p>v2</p>',
      },
      user,
    );

    expect(result).toMatchObject({ versionNumero: 2, estado: 'borrador' });
    expect(versionesRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        versionNumero: 2,
        estado: 'borrador',
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza create si estado inicial no es borrador', async () => {
    formulariosRepositoryMock.findOne.mockResolvedValue({
      id: 'form-1',
      empresaId: user.empresaId,
    });

    await expect(
      service.create(
        {
          formularioId: 'form-1',
          estado: 'publicada',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista versiones solo del tenant autenticado', async () => {
    versionesRepositoryMock.find.mockResolvedValue([{ id: 'ver-1' }]);

    const result = await service.findAll(user, 'form-1');

    expect(result).toHaveLength(1);
    expect(versionesRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId, formularioId: 'form-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('actualiza plantilla solo en borrador', async () => {
    const actual = {
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'borrador',
      plantillaHtml: '<p>old</p>',
      publicadoEn: null,
    };
    const merged = { ...actual, plantillaHtml: '<p>new</p>' };

    versionesRepositoryMock.findOne.mockResolvedValue(actual);
    versionesRepositoryMock.merge.mockReturnValue(merged);
    versionesRepositoryMock.save.mockResolvedValue(merged);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.update(
      'ver-1',
      { plantillaHtml: '<p>new</p>' },
      user,
    );

    expect(result.plantillaHtml).toBe('<p>new</p>');
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza update si intenta cambiar numero de version', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'borrador',
    });

    await expect(
      service.update('ver-1', { versionNumero: 2 }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza update si intenta cambiar estado fuera de publicar', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'borrador',
    });

    await expect(
      service.update('ver-1', { estado: 'publicada' }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza update si version no esta en borrador', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'publicada',
      plantillaHtml: '<p>pub</p>',
    });

    await expect(
      service.update('ver-1', { plantillaHtml: '<p>x</p>' }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove permite solo borrador', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'archivada',
    });

    await expect(service.remove('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debe publicar y archivar version previa', async () => {
    const id = '33333333-3333-3333-3333-333333333333';
    const actual = {
      id,
      empresaId: '11111111-1111-1111-1111-111111111111',
      formularioId: '44444444-4444-4444-4444-444444444444',
      plantillaHtml: '<h1>Acta</h1>',
      estado: 'borrador',
    };

    versionesRepositoryMock.findOne.mockResolvedValue(actual);
    camposRepositoryMock.find.mockResolvedValue([
      {
        id: 'campo-1',
        formularioVersionId: id,
        empresaId: user.empresaId,
        orden: 1,
      },
      {
        id: 'campo-2',
        formularioVersionId: id,
        empresaId: user.empresaId,
        orden: 2,
      },
    ]);
    reglasRepositoryMock.find.mockResolvedValue([
      {
        id: 'regla-1',
        formularioVersionId: id,
        empresaId: user.empresaId,
        campoOrigenId: 'campo-1',
        campoDestinoId: 'campo-2',
      },
    ]);
    versionesRepositoryMock.find.mockResolvedValue([
      {
        id: 'prev',
        estado: 'publicada',
        formularioId: actual.formularioId,
        empresaId: actual.empresaId,
      },
    ]);
    versionesRepositoryMock.save.mockResolvedValue({
      ...actual,
      estado: 'publicada',
      publicadoEn: new Date(),
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.publicar(id, user);
    expect(result.estado).toBe('publicada');
    expect(versionesRepositoryMock.save).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza publicar version sin plantilla', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'borrador',
      plantillaHtml: null,
    });

    await expect(service.publicar('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza publicar version sin campos', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'borrador',
      plantillaHtml: '<h1>Form</h1>',
    });
    camposRepositoryMock.find.mockResolvedValue([]);

    await expect(service.publicar('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza publicar version con orden de campo duplicado', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'borrador',
      plantillaHtml: '<h1>Form</h1>',
    });
    camposRepositoryMock.find.mockResolvedValue([
      { id: 'campo-1', orden: 1 },
      { id: 'campo-2', orden: 1 },
    ]);

    await expect(service.publicar('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza publicar version con reglas invalidas', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'borrador',
      plantillaHtml: '<h1>Form</h1>',
    });
    camposRepositoryMock.find.mockResolvedValue([{ id: 'campo-1', orden: 1 }]);
    reglasRepositoryMock.find.mockResolvedValue([
      {
        id: 'regla-1',
        campoOrigenId: 'campo-1',
        campoDestinoId: 'campo-inexistente',
      },
    ]);

    await expect(service.publicar('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza publicar version archivada', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'archivada',
      plantillaHtml: '<h1>Form</h1>',
    });

    await expect(service.publicar('ver-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('remove elimina borrador y registra bitacora', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      versionNumero: 1,
      estado: 'borrador',
    });
    versionesRepositoryMock.delete.mockResolvedValue({ affected: 1 });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('ver-1', user);

    expect(versionesRepositoryMock.delete).toHaveBeenCalledWith({
      id: 'ver-1',
      empresaId: user.empresaId,
    });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza acceder a una version de otro tenant', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('version-tenant-b', user),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(versionesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'version-tenant-b',
        empresaId: '11111111-1111-1111-1111-111111111111',
      },
    });
  });

  it('preview y print respetan tenant', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-1',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'borrador',
      plantillaHtml: '<h1>Acta</h1>',
    });

    const preview = await service.preview('ver-1', user);
    const printable = await service.print('ver-1', user);

    expect(preview).toMatchObject({ id: 'ver-1', estado: 'borrador' });
    expect(printable.html).toContain('<!doctype html>');
    expect(printable.html).toContain('<h1>Acta</h1>');
  });

  it('preview elimina scripts y atributos on* inseguros', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-2',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'publicada',
      plantillaHtml:
        '<h1 onclick="alert(1)">Acta</h1><script>alert(2)</script><p>OK</p>',
    });

    const preview = await service.preview('ver-2', user);

    expect(preview.html).toContain('<!doctype html>');
    expect(preview.html).toContain('<p>OK</p>');
    expect(preview.html).not.toContain('<script');
    expect(preview.html).not.toContain('onclick=');
  });

  it('print retorna fallback estable cuando plantilla esta vacia', async () => {
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: 'ver-3',
      empresaId: user.empresaId,
      formularioId: 'form-1',
      estado: 'publicada',
      plantillaHtml: '',
    });

    const printable = await service.print('ver-3', user);

    expect(printable.html).toContain('Formulario sin plantilla');
    expect(printable.html).toContain('<!doctype html>');
  });
});
