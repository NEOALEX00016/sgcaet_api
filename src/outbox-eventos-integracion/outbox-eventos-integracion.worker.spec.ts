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
  const integracionesService = {
    dispatchForSolicitud: jest.fn(),
  };

  const claimExecute = jest.fn();

  const worker = new OutboxEventosIntegracionWorker(
    outboxRepository as never,
    solicitudesRepository as never,
    integracionesService as never,
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
});
