import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { FormularioReglasService } from './formulario-reglas.service';

describe('FormularioReglasService', () => {
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'actor@test.local',
  };
  const reglas = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const versiones = { findOne: jest.fn() };
  const campos = { findOne: jest.fn() };
  const bitacora = { create: jest.fn(), save: jest.fn() };
  let service: FormularioReglasService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new FormularioReglasService(
      reglas as never,
      versiones as never,
      campos as never,
      bitacora as never,
    );
  });

  it('crea regla valida y registra bitacora', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValue({ id: 'campo-ok' });
    reglas.create.mockImplementation((v) => v);
    reglas.save.mockResolvedValue({ id: 'regla-1' });
    bitacora.create.mockImplementation((v) => v);
    bitacora.save.mockResolvedValue({ id: 'bit-1' });

    await service.create(
      {
        formularioVersionId: '44444444-4444-4444-4444-444444444444',
        campoOrigenId: '55555555-5555-5555-5555-555555555555',
        operador: 'EQUALS',
        valorEsperado: '  SI ',
        accion: 'MOSTRAR',
        campoDestinoId: '66666666-6666-6666-6666-666666666666',
      },
      user,
    );

    expect(reglas.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        operador: 'equals',
        accion: 'mostrar',
        valorEsperado: 'SI',
      }),
    );
    expect(bitacora.save).toHaveBeenCalled();
  });

  it('rechaza actor falsificado', async () => {
    await expect(
      service.create(
        {
          usuarioActorId: '33333333-3333-3333-3333-333333333333',
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'equals',
          accion: 'mostrar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('exige dos campos de la misma version y tenant', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValueOnce({
      id: '55555555-5555-5555-5555-555555555555',
    });
    campos.findOne.mockResolvedValueOnce(null);
    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'equals',
          accion: 'mostrar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza origen y destino iguales', async () => {
    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'equals',
          valorEsperado: 'x',
          accion: 'mostrar',
          campoDestinoId: '55555555-5555-5555-5555-555555555555',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza operador no soportado', async () => {
    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'regex',
          valorEsperado: 'x',
          accion: 'mostrar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('exige valorEsperado para operadores no unarios', async () => {
    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'contains',
          accion: 'mostrar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite operador unario sin valorEsperado', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    campos.findOne.mockResolvedValue({ id: 'campo-ok' });
    reglas.create.mockImplementation((v) => v);
    reglas.save.mockResolvedValue({ id: 'regla-1' });
    bitacora.create.mockImplementation((v) => v);
    bitacora.save.mockResolvedValue({ id: 'bit-1' });

    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'is_empty',
          accion: 'ocultar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).resolves.toBeDefined();
  });

  it('bloquea cambios cuando version no esta en borrador', async () => {
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'publicada',
    });

    await expect(
      service.create(
        {
          formularioVersionId: '44444444-4444-4444-4444-444444444444',
          campoOrigenId: '55555555-5555-5555-5555-555555555555',
          operador: 'equals',
          valorEsperado: 'x',
          accion: 'mostrar',
          campoDestinoId: '66666666-6666-6666-6666-666666666666',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('remove valida version editable y registra bitacora', async () => {
    reglas.findOne.mockResolvedValue({
      id: 'regla-1',
      empresaId: user.empresaId,
      formularioVersionId: '44444444-4444-4444-4444-444444444444',
      campoOrigenId: '55555555-5555-5555-5555-555555555555',
      campoDestinoId: '66666666-6666-6666-6666-666666666666',
      operador: 'equals',
      accion: 'mostrar',
    });
    versiones.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    reglas.delete.mockResolvedValue({ affected: 1 });
    bitacora.create.mockImplementation((v) => v);
    bitacora.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('regla-1', user);

    expect(reglas.delete).toHaveBeenCalledWith({
      id: 'regla-1',
      empresaId: user.empresaId,
    });
    expect(bitacora.save).toHaveBeenCalled();
  });
});
