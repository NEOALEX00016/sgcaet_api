import { OutboxEventosIntegracionService } from './outbox-eventos-integracion.service';

describe('OutboxEventosIntegracionService', () => {
  const outboxRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    query: jest.fn(),
  };
  const bitacoraRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const outboxWorker = {
    runCycle: jest.fn(),
  };

  const service = new OutboxEventosIntegracionService(
    outboxRepository as never,
    bitacoraRepository as never,
    outboxWorker as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('lista dead-letter tenant-scoped con límite seguro', async () => {
    outboxRepository.find.mockResolvedValue([{ id: 'out-dead-1', estado: 'dead_letter' }]);

    const result = await service.findDeadLetter('emp-1', 9999);

    expect(outboxRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { empresaId: 'emp-1', estado: 'dead_letter' },
        take: 500,
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('ejecuta retry manual auditado e idempotente para dead-letter', async () => {
    const user = {
      userId: 'usr-1',
      empresaId: 'emp-1',
      correo: 'ops@sgcaet.test',
    };
    outboxRepository.findOne
      .mockResolvedValueOnce({
        id: 'out-dead-2',
        empresaId: 'emp-1',
        estado: 'dead_letter',
        intentos: 5,
        maxIntentos: 5,
        ultimoError: 'fallo final',
      })
      .mockResolvedValueOnce({
        id: 'out-dead-2',
        empresaId: 'emp-1',
        estado: 'enviado',
        intentos: 6,
        maxIntentos: 5,
        ultimoError: null,
      });
    outboxRepository.save.mockResolvedValue(undefined);
    bitacoraRepository.create.mockImplementation((v) => v);
    bitacoraRepository.save.mockResolvedValue(undefined);
    outboxWorker.runCycle.mockResolvedValue(1);

    const result = await service.retryDeadLetter('out-dead-2', user);

    expect(result).toMatchObject({
      ok: true,
      id: 'out-dead-2',
      estado: 'enviado',
    });
    expect(bitacoraRepository.save).toHaveBeenCalled();
    expect(outboxWorker.runCycle).toHaveBeenCalledWith(1);
  });

  it('devuelve métricas del worker/outbox por tenant', async () => {
    outboxRepository.query
      .mockResolvedValueOnce([
        { estado: 'pendiente', total: 2 },
        { estado: 'error', total: 1 },
        { estado: 'dead_letter', total: 1 },
      ])
      .mockResolvedValueOnce([{ oldest_pending_age_seconds: 120 }])
      .mockResolvedValueOnce([{ avg_dispatch_latency_seconds: 8 }])
      .mockResolvedValueOnce([{ due_retry_count: 1 }]);

    const result = await service.getMetrics('emp-1');

    expect(result).toMatchObject({
      counts: {
        pendiente: 2,
        procesando: 0,
        enviado: 0,
        error: 1,
        deadLetter: 1,
      },
      queueDepth: 4,
      dueRetryCount: 1,
      oldestPendingAgeSeconds: 120,
      avgDispatchLatencySeconds: 8,
    });
  });
});
