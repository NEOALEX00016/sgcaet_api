import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FormularioCamposService } from './formulario-campos.service';

describe('FormularioCamposService', () => {
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'actor@test.local',
  };
  const campos = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const versiones = { findOne: jest.fn() };
  const bitacora = { create: jest.fn(), save: jest.fn() };
  let service: FormularioCamposService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new FormularioCamposService(
      campos as never,
      versiones as never,
      bitacora as never,
    );
  });

  it('rechaza tenant o actor falsificados', async () => {
    await expect(
      service.create(
        {
          empresaId: '33333333-3333-3333-3333-333333333333',
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          clave: 'x',
          etiqueta: 'X',
          tipoCampo: 'text',
          orden: 1,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('valida version tenant-scoped y registra bitacora', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValueOnce(undefined).mockResolvedValueOnce(null);
    campos.create.mockImplementation((value) => value);
    campos.save.mockResolvedValue({ id: 'campo-1', empresaId: user.empresaId });
    bitacora.create.mockImplementation((value) => value);
    bitacora.save.mockResolvedValue({});
    await service.create(
      {
        formularioVersionId: '44444444-4444-4444-4444-444444444444',
        clave: 'x',
        etiqueta: 'X',
        tipoCampo: 'text',
        orden: 1,
      },
      user,
    );
    expect(versiones.findOne).toHaveBeenCalledWith({
      where: {
        id: '44444444-4444-4444-4444-444444444444',
        empresaId: user.empresaId,
      },
    });
    expect(campos.findOne).toHaveBeenCalledWith({
      where: {
        formularioVersionId: '44444444-4444-4444-4444-444444444444',
        clave: 'x',
      },
    });
    expect(bitacora.save).toHaveBeenCalled();
  });

  it('rechaza claves duplicadas por version', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          clave: 'x',
          etiqueta: 'X',
          tipoCampo: 'text',
          orden: 1,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza orden duplicado por version', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValueOnce(undefined).mockResolvedValueOnce({
      id: 'campo-otro',
    });

    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          clave: 'nuevo',
          etiqueta: 'Nuevo',
          tipoCampo: 'text',
          orden: 1,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza requerido en tipos decorativos', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });

    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          clave: 'separador',
          etiqueta: 'Separador',
          tipoCampo: 'separator',
          orden: 2,
          requerido: true,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('normaliza clave y etiqueta en create', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValueOnce(undefined).mockResolvedValueOnce(null);
    campos.create.mockImplementation((value) => value);
    campos.save.mockResolvedValue({ id: 'campo-1' });
    bitacora.create.mockImplementation((value) => value);
    bitacora.save.mockResolvedValue({});

    await service.create(
      {
        formularioVersionId: '44444444-4444-4444-4444-444444444444',
        clave: '  SERIAL_NUMBER  ',
        etiqueta: '  Serial Number  ',
        tipoCampo: 'TEXT',
        orden: 3,
      },
      user,
    );

    expect(campos.create).toHaveBeenCalledWith(
      expect.objectContaining({
        clave: 'serial_number',
        etiqueta: 'Serial Number',
        tipoCampo: 'text',
      }),
    );
  });

  it('rechaza cambios cuando la version no esta en borrador', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'publicada',
    });

    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          clave: 'x',
          etiqueta: 'X',
          tipoCampo: 'text',
          orden: 1,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('update valida orden unico y version editable', async () => {
    const actual = {
      id: 'campo-1',
      empresaId: user.empresaId,
      formularioVersionId: '44444444-4444-4444-4444-444444444444',
      clave: 'serial',
      etiqueta: 'Serial',
      tipoCampo: 'text',
      orden: 1,
      requerido: false,
    };

    campos.findOne
      .mockResolvedValueOnce(actual)
      .mockResolvedValueOnce({ id: 'campo-2' });
    versiones.findOne.mockResolvedValue({
      id: actual.formularioVersionId,
      empresaId: user.empresaId,
      estado: 'borrador',
    });

    await expect(
      service.update(actual.id, { orden: 2 }, user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove rechaza cuando version no es borrador', async () => {
    const actual = {
      id: 'campo-1',
      empresaId: user.empresaId,
      formularioVersionId: '44444444-4444-4444-4444-444444444444',
      clave: 'serial',
      etiqueta: 'Serial',
      tipoCampo: 'text',
      orden: 1,
    };

    campos.findOne.mockResolvedValue(actual);
    versiones.findOne.mockResolvedValue({
      id: actual.formularioVersionId,
      empresaId: user.empresaId,
      estado: 'publicada',
    });

    await expect(service.remove('campo-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
