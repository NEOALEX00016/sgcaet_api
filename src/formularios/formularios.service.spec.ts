import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { FormulariosService } from './formularios.service';
import { Formulario } from './entities/formulario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('FormulariosService', () => {
  let service: FormulariosService;
  const formulariosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
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
        FormulariosService,
        {
          provide: getRepositoryToken(Formulario),
          useValue: formulariosRepositoryMock,
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

    service = module.get<FormulariosService>(FormulariosService);
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear formulario y registrar bitacora', async () => {
    const dto = {
      codigo: '  acta-entrega  ',
      nombre: '  Acta de entrega  ',
      tipoUso: 'asignacion',
    };

    formulariosRepositoryMock.findOne.mockResolvedValue(null);
    const creado = {
      id: 'for-1',
      empresaId: user.empresaId,
      codigo: 'ACTA-ENTREGA',
      nombre: 'Acta de entrega',
      tipoUso: 'asignacion',
      estaActivo: true,
    };
    formulariosRepositoryMock.create.mockReturnValue(creado);
    formulariosRepositoryMock.save.mockResolvedValue(creado);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(result).toMatchObject({ id: 'for-1', codigo: 'ACTA-ENTREGA' });
    expect(formulariosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId, codigo: 'ACTA-ENTREGA' },
      withDeleted: true,
    });
    expect(formulariosRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        codigo: 'ACTA-ENTREGA',
        nombre: 'Acta de entrega',
        estaActivo: true,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza codigo duplicado por tenant al crear', async () => {
    formulariosRepositoryMock.findOne.mockResolvedValue({
      id: 'for-existente',
      empresaId: user.empresaId,
      codigo: 'ACTA-ENTREGA',
    });

    await expect(
      service.create(
        {
          codigo: 'acta-entrega',
          nombre: 'Acta de entrega',
          tipoUso: 'asignacion',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lista formularios solo del tenant autenticado', async () => {
    formulariosRepositoryMock.find.mockResolvedValue([{ id: 'for-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(formulariosRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('rechaza acceso a formulario de otro tenant', async () => {
    formulariosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.findOne('for-tenant-b', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('actualiza formulario y registra auditoria', async () => {
    const actual = {
      id: 'for-1',
      empresaId: user.empresaId,
      codigo: 'ACTA-ENTREGA',
      nombre: 'Acta de entrega',
      tipoUso: 'asignacion',
      estaActivo: true,
    };
    const merged = { ...actual, nombre: 'Acta de entrega v2' };

    formulariosRepositoryMock.findOne
      .mockResolvedValueOnce(actual)
      .mockResolvedValueOnce(null);
    formulariosRepositoryMock.merge.mockReturnValue(merged);
    formulariosRepositoryMock.save.mockResolvedValue(merged);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.update(
      'for-1',
      { nombre: 'Acta de entrega v2' },
      user,
    );

    expect(result).toMatchObject({ id: 'for-1', nombre: 'Acta de entrega v2' });
    expect(formulariosRepositoryMock.merge).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza codigo duplicado en update cuando cambia codigo', async () => {
    const actual = {
      id: 'for-1',
      empresaId: user.empresaId,
      codigo: 'ACTA-ENTREGA',
      nombre: 'Acta de entrega',
      tipoUso: 'asignacion',
      estaActivo: true,
    };

    formulariosRepositoryMock.findOne
      .mockResolvedValueOnce(actual)
      .mockResolvedValueOnce({
        id: 'for-2',
        empresaId: user.empresaId,
        codigo: 'ACTA-ALTA',
      });

    await expect(
      service.update('for-1', { codigo: 'acta-alta' }, user),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('desactiva formulario en remove (baja logica) y registra auditoria', async () => {
    const actual = {
      id: 'for-1',
      empresaId: user.empresaId,
      codigo: 'ACTA-ENTREGA',
      nombre: 'Acta de entrega',
      tipoUso: 'asignacion',
      estaActivo: true,
    };

    formulariosRepositoryMock.findOne.mockResolvedValue(actual);
    formulariosRepositoryMock.save.mockResolvedValue({
      ...actual,
      estaActivo: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('for-1', user);

    expect(formulariosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'for-1',
        estaActivo: false,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
