import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { OutboxEventoIntegracion } from './entities/outbox-evento-integracion.entity';
import { IntegracionesMesaAyudaService } from '../integraciones-mesa-ayuda/integraciones-mesa-ayuda.service';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';

@Injectable()
export class OutboxEventosIntegracionWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxEventosIntegracionWorker.name);
  private timer?: NodeJS.Timeout;
  private running = false;
  private readonly workerId = `worker-${process.pid}`;
  private readonly lockStaleMs = Number(
    process.env.OUTBOX_WORKER_LOCK_STALE_MS ?? 5 * 60 * 1000,
  );
  private readonly backoffBaseMs = Number(
    process.env.OUTBOX_BACKOFF_BASE_MS ?? 60 * 1000,
  );
  private readonly backoffMaxMs = Number(
    process.env.OUTBOX_BACKOFF_MAX_MS ?? 30 * 60 * 1000,
  );

  constructor(
    @InjectRepository(OutboxEventoIntegracion)
    private readonly outboxRepository: Repository<OutboxEventoIntegracion>,
    @InjectRepository(Solicitud)
    private readonly solicitudesRepository: Repository<Solicitud>,
    private readonly integracionesService: IntegracionesMesaAyudaService,
  ) {}

  onModuleInit() {
    const enabled =
      process.env.OUTBOX_WORKER_ENABLED !== 'false' &&
      process.env.NODE_ENV !== 'test';
    if (!enabled) {
      this.logger.log('Outbox worker deshabilitado por OUTBOX_WORKER_ENABLED=false');
      return;
    }

    const intervalMs = Number(process.env.OUTBOX_WORKER_INTERVAL_MS ?? '5000');
    this.timer = setInterval(() => {
      void this.runCycle();
    }, intervalMs);

    void this.runCycle();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  async runCycle(limit = 10): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const now = new Date();
      const events = await this.outboxRepository.find({
        where: [
          {
            estado: In(['pendiente', 'error']),
            siguienteIntentoEn: IsNull(),
          },
          {
            estado: In(['pendiente', 'error']),
            siguienteIntentoEn: LessThanOrEqual(now),
          },
          {
            estado: 'procesando',
            lockedAt: LessThanOrEqual(new Date(now.getTime() - this.lockStaleMs)),
          },
        ],
        order: { createdAt: 'ASC' },
        take: limit,
      });

      let processed = 0;
      for (const event of events) {
        const claimed = await this.claimEvent(event.id);
        if (!claimed) continue;
        await this.processClaimedEvent(claimed);
        processed += 1;
      }
      return processed;
    } finally {
      this.running = false;
    }
  }

  private async claimEvent(id: string): Promise<OutboxEventoIntegracion | null> {
    const now = new Date();
    const result = await this.outboxRepository
      .createQueryBuilder()
      .update(OutboxEventoIntegracion)
      .set({
        estado: 'procesando',
        lockedBy: this.workerId,
        lockedAt: now,
      })
      .where('id = :id', { id })
      .andWhere(
        "((estado IN ('pendiente','error') AND (siguiente_intento_en IS NULL OR siguiente_intento_en <= NOW())) OR (estado = 'procesando' AND locked_at <= NOW() - (:lockStaleMs * INTERVAL '1 millisecond')))",
        { lockStaleMs: this.lockStaleMs },
      )
      .execute();

    if (!result.affected) return null;
    return this.outboxRepository.findOne({ where: { id } });
  }

  private async processClaimedEvent(event: OutboxEventoIntegracion): Promise<void> {
    const solicitudId = String(event.payloadJson?.solicitudId ?? event.aggregateId);
    try {
      if (event.eventType !== 'solicitud_creada') {
        throw new Error(`Tipo de evento no soportado: ${event.eventType}`);
      }

      const solicitud = await this.solicitudesRepository.findOne({
        where: {
          id: solicitudId,
          empresaId: event.empresaId,
        },
      });

      if (!solicitud) {
        throw new Error(`Solicitud no encontrada para outbox: ${solicitudId}`);
      }

      await this.integracionesService.dispatchForSolicitud(solicitud);

      await this.outboxRepository.update(
        { id: event.id },
        {
          estado: 'enviado',
          intentos: event.intentos + 1,
          procesadoEn: new Date(),
          siguienteIntentoEn: null,
          ultimoError: null,
          lockedBy: null,
          lockedAt: null,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Error procesando evento outbox';
      const nextAttempts = event.intentos + 1;
      const maxAttempts = event.maxIntentos ?? 10;
      const deadLetter = nextAttempts >= maxAttempts;
      const backoffMs = this.calculateBackoffMs(nextAttempts);

      await this.outboxRepository.update(
        { id: event.id },
        {
          estado: deadLetter ? 'dead_letter' : 'error',
          intentos: nextAttempts,
          siguienteIntentoEn: deadLetter
            ? null
            : new Date(Date.now() + backoffMs),
          ultimoError: message,
          lockedBy: null,
          lockedAt: null,
        },
      );

      this.logger.error(
        `Outbox ${event.id} fallo en intento ${nextAttempts}: ${message}`,
      );
    }
  }

  private calculateBackoffMs(attemptNumber: number): number {
    const safeAttempt = Math.max(1, attemptNumber);
    const exponentialFactor = Math.min(safeAttempt - 1, 10);
    const ms = this.backoffBaseMs * 2 ** exponentialFactor;
    return Math.min(this.backoffMaxMs, Math.max(this.backoffBaseMs, ms));
  }
}
