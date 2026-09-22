import { OutboxEventosIntegracionWorker } from './outbox-eventos-integracion.worker';

describe('OutboxEventosIntegracionWorker', () => {
  const outboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const solicitudesRepository = {
    findOne: jest.fn(),
  };
  const reparacionesRepository = { findOne: jest.fn() };
  const asignacionesRepository = { findOne: jest.fn() };
  const personasRepository = { findOne: jest.fn() };
  const activosRepository = { findOne: jest.fn() };
  const integracionesService = {
    dispatchForSolicitud: jest.fn(),
  };
  const configuracionTenantService = { sendCorreo: jest.fn() };

  const claimExecute = jest.fn();

  const worker = new OutboxEventosIntegracionWorker(
    outboxRepository as never,
    solicitudesRepository as never,
    reparacionesRepository as never,
    asignacionesRepository as never,
    personasRepository as never,
    activosRepository as never,
    integracionesService as never,
    configuracionTenantService as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    outboxRepository.createQueryBuilder.mockReturnValue({
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: claimExecute,
    });
  });

  it('procesa evento pendiente y lo marca enviado', async () => {
    outboxRepository.find.mockResolvedValue([
      {
        id: 'out-1',
        empresaId: 'emp-1',
        aggregateId: 'sol-1',
        eventType: 'solicitud_creada',
        payloadJson: { solicitudId: 'sol-1' },
        intentos: 0,
        maxIntentos: 10,
      },
    ]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue({
      id: 'out-1',
      empresaId: 'emp-1',
      aggregateId: 'sol-1',
      eventType: 'solicitud_creada',
      payloadJson: { solicitudId: 'sol-1' },
      intentos: 0,
      maxIntentos: 10,
    });
    solicitudesRepository.findOne.mockResolvedValue({
      id: 'sol-1',
      empresaId: 'emp-1',
    });
    integracionesService.dispatchForSolicitud.mockResolvedValue(undefined);

    const processed = await worker.runCycle(10);

    expect(processed).toBe(1);
    expect(integracionesService.dispatchForSolicitud).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'sol-1' }),
    );
    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-1' },
      expect.objectContaining({ estado: 'enviado', intentos: 1 }),
    );
  });

  it('marca error con reintento cuando falla dispatch', async () => {
    outboxRepository.find.mockResolvedValue([
      {
        id: 'out-2',
        empresaId: 'emp-1',
        aggregateId: 'sol-2',
        eventType: 'solicitud_creada',
        payloadJson: { solicitudId: 'sol-2' },
        intentos: 1,
        maxIntentos: 10,
      },
    ]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue({
      id: 'out-2',
      empresaId: 'emp-1',
      aggregateId: 'sol-2',
      eventType: 'solicitud_creada',
      payloadJson: { solicitudId: 'sol-2' },
      intentos: 1,
      maxIntentos: 10,
    });
    solicitudesRepository.findOne.mockResolvedValue({
      id: 'sol-2',
      empresaId: 'emp-1',
    });
    integracionesService.dispatchForSolicitud.mockRejectedValue(
      new Error('timeout externo'),
    );

    await worker.runCycle(10);

    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-2' },
      expect.objectContaining({ estado: 'error', intentos: 2 }),
    );
  });

  it('envia a dead_letter cuando alcanza maxIntentos', async () => {
    outboxRepository.find.mockResolvedValue([
      {
        id: 'out-3',
        empresaId: 'emp-1',
        aggregateId: 'sol-3',
        eventType: 'solicitud_creada',
        payloadJson: { solicitudId: 'sol-3' },
        intentos: 2,
        maxIntentos: 3,
      },
    ]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue({
      id: 'out-3',
      empresaId: 'emp-1',
      aggregateId: 'sol-3',
      eventType: 'solicitud_creada',
      payloadJson: { solicitudId: 'sol-3' },
      intentos: 2,
      maxIntentos: 3,
    });
    solicitudesRepository.findOne.mockResolvedValue({
      id: 'sol-3',
      empresaId: 'emp-1',
    });
    integracionesService.dispatchForSolicitud.mockRejectedValue(
      new Error('fallo final'),
    );

    await worker.runCycle(10);

    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-3' },
      expect.objectContaining({
        estado: 'dead_letter',
        intentos: 3,
        siguienteIntentoEn: null,
      }),
    );
  });

  it('calcula backoff exponencial acotado', () => {
    const method = worker as unknown as {
      calculateBackoffMs: (attemptNumber: number) => number;
    };

    expect(method.calculateBackoffMs(1)).toBe(60_000);
    expect(method.calculateBackoffMs(2)).toBe(120_000);
    expect(method.calculateBackoffMs(3)).toBe(240_000);
    expect(method.calculateBackoffMs(10)).toBe(1_800_000);
  });

  it('envia una notificacion de Taller al correo de la persona asignada', async () => {
    const event = {
      id: 'out-workshop',
      empresaId: 'emp-1',
      aggregateId: 'rep-1',
      eventType: 'diagnostico_comunicado',
      payloadJson: { reparacionId: 'rep-1', diagnostico: 'Falla de disco' },
      intentos: 0,
      maxIntentos: 10,
    };
    outboxRepository.find.mockResolvedValue([event]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue(event);
    reparacionesRepository.findOne.mockResolvedValue({
      id: 'rep-1',
      empresaId: 'emp-1',
      asignacionId: 'asg-1',
      activoId: 'asset-1',
      estado: 'en_proceso',
      diagnostico: 'Falla de disco',
    });
    asignacionesRepository.findOne.mockResolvedValue({
      id: 'asg-1',
      personaId: 'person-1',
    });
    personasRepository.findOne.mockResolvedValue({
      id: 'person-1',
      correo: 'persona@example.com',
    });
    activosRepository.findOne.mockResolvedValue({
      id: 'asset-1',
      codigoActivo: 'EQ-001',
      nombre: 'Laptop',
      marca: 'Dell',
      modelo: 'Latitude',
      serial: 'SER-001',
    });

    await worker.runCycle(10);

    expect(configuracionTenantService.sendCorreo).toHaveBeenCalledWith(
      'emp-1',
      expect.objectContaining({
        to: 'persona@example.com',
        subject: expect.stringContaining('Diagnostico comunicado'),
        text: expect.stringContaining('EQ-001 - Laptop'),
      }),
    );
    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-workshop' },
      expect.objectContaining({ estado: 'enviado', intentos: 1 }),
    );
  });

  it('mantiene retry normal cuando la persona no tiene correo', async () => {
    const event = {
      id: 'out-no-email',
      empresaId: 'emp-1',
      aggregateId: 'rep-2',
      eventType: 'orden_recibida',
      payloadJson: { reparacionId: 'rep-2' },
      intentos: 0,
      maxIntentos: 10,
    };
    outboxRepository.find.mockResolvedValue([event]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue(event);
    reparacionesRepository.findOne.mockResolvedValue({
      id: 'rep-2',
      empresaId: 'emp-1',
      asignacionId: 'asg-2',
      activoId: 'asset-2',
    });
    asignacionesRepository.findOne.mockResolvedValue({
      id: 'asg-2',
      personaId: 'person-2',
    });
    personasRepository.findOne.mockResolvedValue({ id: 'person-2' });

    await worker.runCycle(10);

    expect(configuracionTenantService.sendCorreo).not.toHaveBeenCalled();
    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-no-email' },
      expect.objectContaining({
        estado: 'error',
        intentos: 1,
        ultimoError: expect.stringContaining('no tiene correo configurado'),
      }),
    );
  });

  it('mantiene sin cambios el rechazo de eventos no soportados', async () => {
    const event = {
      id: 'out-unsupported',
      empresaId: 'emp-1',
      aggregateId: 'aggregate-1',
      eventType: 'evento_desconocido',
      payloadJson: {},
      intentos: 0,
      maxIntentos: 10,
    };
    outboxRepository.find.mockResolvedValue([event]);
    claimExecute.mockResolvedValue({ affected: 1 });
    outboxRepository.findOne.mockResolvedValue(event);

    await worker.runCycle(10);

    expect(outboxRepository.update).toHaveBeenCalledWith(
      { id: 'out-unsupported' },
      expect.objectContaining({
        estado: 'error',
        ultimoError: 'Tipo de evento no soportado: evento_desconocido',
      }),
    );
  });
});
