import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { OutboxEventoIntegracion } from './entities/outbox-evento-integracion.entity';
import { IntegracionesMesaAyudaService } from '../integraciones-mesa-ayuda/integraciones-mesa-ayuda.service';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Activo } from '../activos/entities/activo.entity';
import { ConfiguracionOperativaTenantService } from '../configuracion-operativa-tenant/configuracion-operativa-tenant.service';

const WORKSHOP_EVENT_TYPES = new Set([
  'orden_recibida',
  'diagnostico_comunicado',
  'esperando_repuestos',
  'orden_resuelta',
]);

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
    @InjectRepository(ReparacionActivo)
    private readonly reparacionesRepository: Repository<ReparacionActivo>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    private readonly integracionesService: IntegracionesMesaAyudaService,
    private readonly configuracionTenantService: ConfiguracionOperativaTenantService,
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
    try {
      if (event.eventType === 'solicitud_creada') {
        await this.dispatchSolicitud(event);
      } else if (WORKSHOP_EVENT_TYPES.has(event.eventType)) {
        await this.dispatchWorkshopEvent(event);
      } else {
        throw new Error(`Tipo de evento no soportado: ${event.eventType}`);
      }

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

  private async dispatchSolicitud(event: OutboxEventoIntegracion): Promise<void> {
    const solicitudId = String(event.payloadJson?.solicitudId ?? event.aggregateId);
    const solicitud = await this.solicitudesRepository.findOne({
      where: { id: solicitudId, empresaId: event.empresaId },
    });
    if (!solicitud) {
      throw new Error(`Solicitud no encontrada para outbox: ${solicitudId}`);
    }
    await this.integracionesService.dispatchForSolicitud(solicitud);
  }

  private async dispatchWorkshopEvent(
    event: OutboxEventoIntegracion,
  ): Promise<void> {
    const orderId = String(event.payloadJson?.reparacionId ?? event.aggregateId);
    const order = await this.reparacionesRepository.findOne({
      where: { id: orderId, empresaId: event.empresaId },
    });
    if (!order) {
      throw new Error(`Orden de taller no encontrada para outbox: ${orderId}`);
    }
    if (!order.asignacionId) {
      throw new Error(
        `Orden de taller ${orderId} no tiene asignacion para resolver destinatario`,
      );
    }
    const assignment = await this.asignacionesRepository.findOne({
      where: { id: order.asignacionId, empresaId: event.empresaId },
    });
    if (!assignment?.personaId) {
      throw new Error(
        `Asignacion ${order.asignacionId} de la orden ${orderId} no tiene persona destinataria`,
      );
    }
    const person = await this.personasRepository.findOne({
      where: { id: assignment.personaId, empresaId: event.empresaId },
    });
    if (!person?.correo?.trim()) {
      throw new Error(
        `Persona ${assignment.personaId} de la orden ${orderId} no tiene correo configurado`,
      );
    }
    const asset = await this.activosRepository.findOne({
      where: { id: order.activoId, empresaId: event.empresaId },
    });
    if (!asset) {
      throw new Error(`Activo ${order.activoId} de la orden ${orderId} no encontrado`);
    }

    const details = this.workshopMessage(event, order, asset);
    await this.configuracionTenantService.sendCorreo(event.empresaId, {
      to: person.correo.trim(),
      ...details,
    });
  }

  private workshopMessage(
    event: OutboxEventoIntegracion,
    order: ReparacionActivo,
    asset: Activo,
  ): { subject: string; text: string } {
    const labels: Record<string, string> = {
      orden_recibida: 'Orden recibida',
      diagnostico_comunicado: 'Diagnostico comunicado',
      esperando_repuestos: 'Orden esperando repuestos',
      orden_resuelta: 'Orden resuelta',
    };
    const payload = event.payloadJson ?? {};
    const lines = [
      labels[event.eventType],
      `Orden: ${order.id}`,
      `Activo: ${asset.codigoActivo} - ${asset.nombre}`,
      `Marca/modelo: ${[asset.marca, asset.modelo].filter(Boolean).join(' ') || 'No registrado'}`,
      `Serial: ${asset.serial || 'No registrado'}`,
      `Estado: ${String(payload.estado ?? order.estado)}`,
    ];
    if (event.eventType === 'diagnostico_comunicado') {
      lines.push(`Diagnostico: ${String(payload.diagnostico ?? order.diagnostico)}`);
    }
    if (event.eventType === 'orden_resuelta') {
      lines.push(`Resultado: ${String(payload.resultado ?? order.resultado ?? '')}`);
      lines.push(`Resolucion: ${String(payload.resolucion ?? order.resolucion ?? '')}`);
    }
    return {
      subject: `[SGCAET] ${labels[event.eventType]} - orden ${order.id}`,
      text: lines.join('\n'),
    };
  }

  private calculateBackoffMs(attemptNumber: number): number {
    const safeAttempt = Math.max(1, attemptNumber);
    const exponentialFactor = Math.min(safeAttempt - 1, 10);
    const ms = this.backoffBaseMs * 2 ** exponentialFactor;
    return Math.min(this.backoffMaxMs, Math.max(this.backoffBaseMs, ms));
  }
}
