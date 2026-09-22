import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { PersonasService } from './personas.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PersonasSyncSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PersonasSyncSchedulerService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    @InjectRepository(FuentesEmpleado)
    private readonly fuentesRepository: Repository<FuentesEmpleado>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly personasService: PersonasService,
  ) {}

  onModuleInit() {
    const enabled =
      process.env.PERSONAS_SYNC_WORKER_ENABLED !== 'false' &&
      process.env.NODE_ENV !== 'test';
    if (!enabled) {
      this.logger.log(
        'Personas sync worker deshabilitado por PERSONAS_SYNC_WORKER_ENABLED=false',
      );
      return;
    }

    const intervalMs = Number(process.env.PERSONAS_SYNC_WORKER_INTERVAL_MS ?? '60000');
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

  async runCycle(limit = 5): Promise<number> {
    if (this.running) return 0;
    this.running = true;
    try {
      const now = new Date();
      const sources = await this.fuentesRepository.find({
        where: [
          {
            tipoFuente: 'api_rest',
            estado: 'activa',
            proximaSincronizacionEn: IsNull(),
          },
          {
            tipoFuente: 'api_rest',
            estado: 'activa',
            proximaSincronizacionEn: LessThanOrEqual(now),
          },
        ],
        order: { proximaSincronizacionEn: 'ASC', createdAt: 'ASC' },
        take: limit,
      });

      for (const source of sources) {
        await this.processSource(source, now);
      }

      return sources.length;
    } finally {
      this.running = false;
    }
  }

  private async processSource(source: FuentesEmpleado, now: Date) {
    const intervalMinutes = this.resolveIntervalMinutes(source.mapeoCampos ?? {});
    const nextSync = new Date(now.getTime() + intervalMinutes * 60 * 1000);

    const actor = await this.usuariosRepository.findOne({
      where: {
        empresaId: source.empresaId,
        estado: 'activo',
        deletedAt: IsNull(),
      },
      order: { createdAt: 'ASC' },
    });

    if (!actor) {
      this.logger.warn(
        `Sin actor activo para sincronizar fuente ${source.id} en empresa ${source.empresaId}`,
      );
      await this.fuentesRepository.update(
        { id: source.id },
        { proximaSincronizacionEn: nextSync },
      );
      return;
    }

    const user: AuthenticatedUser = {
      userId: actor.id,
      empresaId: source.empresaId,
      correo: actor.correo,
    };

    try {
      await this.personasService.importFromApi(
        {
          fuenteEmpleadosId: source.id,
        },
        user,
      );

      await this.fuentesRepository.update(
        { id: source.id },
        {
          ultimaSincronizacionEn: now,
          proximaSincronizacionEn: nextSync,
        },
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error de sincronizacion automatica de personas';
      this.logger.error(
        `Fallo sincronizacion automatica para fuente ${source.id}: ${message}`,
      );

      await this.fuentesRepository.update(
        { id: source.id },
        {
          ultimaSincronizacionEn: now,
          proximaSincronizacionEn: nextSync,
        },
      );
    }
  }

  private resolveIntervalMinutes(mapping: Record<string, unknown>): number {
    const raw = mapping.syncIntervalMinutes;
    const parsed =
      typeof raw === 'number'
        ? raw
        : typeof raw === 'string'
          ? Number(raw)
          : Number.NaN;
    if (!Number.isFinite(parsed) || parsed < 5) {
      return 60;
    }
    return Math.floor(parsed);
  }
}
