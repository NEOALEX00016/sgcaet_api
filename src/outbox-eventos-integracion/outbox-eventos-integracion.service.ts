import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Repository } from 'typeorm';
import { OutboxEventoIntegracion } from './entities/outbox-evento-integracion.entity';
import { OutboxEventosIntegracionWorker } from './outbox-eventos-integracion.worker';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Injectable()
export class OutboxEventosIntegracionService {
  constructor(
    @InjectRepository(OutboxEventoIntegracion)
    private readonly outboxRepository: Repository<OutboxEventoIntegracion>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    private readonly outboxWorker: OutboxEventosIntegracionWorker,
  ) {}

  findDeadLetter(empresaId: string, limit = 100): Promise<OutboxEventoIntegracion[]> {
    const safeLimit = Math.max(1, Math.min(limit, 500));
    return this.outboxRepository.find({
      where: { empresaId, estado: 'dead_letter' },
      order: { updatedAt: 'DESC' },
      take: safeLimit,
    });
  }

  async getMetrics(empresaId: string) {
    const byStateRows = (await this.outboxRepository.query(
      `
      SELECT estado, COUNT(*)::int AS total
      FROM sgcaet_core.outbox_eventos_integracion
      WHERE empresa_id = $1
      GROUP BY estado
      `,
      [empresaId],
    )) as Array<{ estado: string; total: number }>;

    const oldestPendingRows = (await this.outboxRepository.query(
      `
      SELECT EXTRACT(EPOCH FROM (NOW() - MIN(created_at)))::int AS oldest_pending_age_seconds
      FROM sgcaet_core.outbox_eventos_integracion
      WHERE empresa_id = $1
        AND estado IN ('pendiente', 'error', 'procesando')
      `,
      [empresaId],
    )) as Array<{ oldest_pending_age_seconds: number | null }>;

    const avgLatencyRows = (await this.outboxRepository.query(
      `
      SELECT AVG(EXTRACT(EPOCH FROM (procesado_en - created_at)))::int AS avg_dispatch_latency_seconds
      FROM sgcaet_core.outbox_eventos_integracion
      WHERE empresa_id = $1
        AND estado = 'enviado'
        AND procesado_en IS NOT NULL
        AND procesado_en >= NOW() - INTERVAL '24 hours'
      `,
      [empresaId],
    )) as Array<{ avg_dispatch_latency_seconds: number | null }>;

    const dueRetryRows = (await this.outboxRepository.query(
      `
      SELECT COUNT(*)::int AS due_retry_count
      FROM sgcaet_core.outbox_eventos_integracion
      WHERE empresa_id = $1
        AND estado = 'error'
        AND siguiente_intento_en IS NOT NULL
        AND siguiente_intento_en <= NOW()
      `,
      [empresaId],
    )) as Array<{ due_retry_count: number | null }>;

    const counts = {
      pendiente: 0,
      procesando: 0,
      enviado: 0,
      error: 0,
      deadLetter: 0,
    };
    for (const row of byStateRows) {
      if (row.estado === 'dead_letter') {
        counts.deadLetter = Number(row.total ?? 0);
      } else if (row.estado in counts) {
        counts[row.estado as 'pendiente' | 'procesando' | 'enviado' | 'error'] =
          Number(row.total ?? 0);
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      counts,
      queueDepth:
        counts.pendiente + counts.error + counts.procesando + counts.deadLetter,
      dueRetryCount: Number(dueRetryRows[0]?.due_retry_count ?? 0),
      oldestPendingAgeSeconds: Number(
        oldestPendingRows[0]?.oldest_pending_age_seconds ?? 0,
      ),
      avgDispatchLatencySeconds: Number(
        avgLatencyRows[0]?.avg_dispatch_latency_seconds ?? 0,
      ),
    };
  }

  async retryDeadLetter(id: string, user: AuthenticatedUser) {
    const event = await this.outboxRepository.findOne({
      where: {
        id,
        empresaId: user.empresaId,
      },
    });
    if (!event || event.estado !== 'dead_letter') {
      return { ok: false, reason: 'Evento dead-letter no encontrado' };
    }

    const before = {
      estado: event.estado,
      intentos: event.intentos,
      maxIntentos: event.maxIntentos,
      ultimoError: event.ultimoError,
      siguienteIntentoEn: event.siguienteIntentoEn,
    };

    event.estado = 'pendiente';
    event.siguienteIntentoEn = null;
    event.lockedBy = null;
    event.lockedAt = null;
    await this.outboxRepository.save(event);

    await this.registrarBitacora(user, event.id, before, {
      estado: event.estado,
      intentos: event.intentos,
      maxIntentos: event.maxIntentos,
      ultimoError: event.ultimoError,
      siguienteIntentoEn: event.siguienteIntentoEn,
    });

    await this.outboxWorker.runCycle(1);

    const refreshed = await this.outboxRepository.findOne({
      where: {
        id,
        empresaId: user.empresaId,
      },
    });

    return {
      ok: true,
      id,
      estado: refreshed?.estado ?? event.estado,
      intentos: refreshed?.intentos ?? event.intentos,
      ultimoError: refreshed?.ultimoError,
    };
  }

  private async registrarBitacora(
    user: AuthenticatedUser,
    entidadId: string,
    valoresAnteriores: Record<string, unknown>,
    valoresNuevos: Record<string, unknown>,
  ) {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion: 'OUTBOX_RETRY_MANUAL',
      entidad: 'outbox_eventos_integracion',
      entidadId,
      valoresAnteriores,
      valoresNuevos,
      resultado: 'exito',
    });
    await this.bitacoraRepository.save(registro);
  }
}
