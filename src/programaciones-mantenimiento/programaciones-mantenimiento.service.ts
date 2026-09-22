import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Raw, Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Activo } from '../activos/entities/activo.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { CreateProgramacionesMantenimientoDto } from './dto/create-programaciones-mantenimiento.dto';
import { UpdateProgramacionesMantenimientoDto } from './dto/update-programaciones-mantenimiento.dto';
import { ProgramacionMantenimiento } from './entities/programaciones-mantenimiento.entity';

export type EstadoProgramacion = 'proxima' | 'vencida' | 'vigente';

@Injectable()
export class ProgramacionesMantenimientoService {
  constructor(
    @InjectRepository(ProgramacionMantenimiento)
    private readonly repository: Repository<ProgramacionMantenimiento>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateProgramacionesMantenimientoDto,
    user: AuthenticatedUser,
  ) {
    await this.validarReferencias(
      dto.activoId,
      dto.formularioId,
      user.empresaId,
    );
    if (dto.estaActiva !== false) {
      await this.validarNombreUnico(dto.activoId, dto.nombre, user.empresaId);
    }
    const saved = await this.repository.save(
      this.repository.create({
        ...dto,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim(),
        proximaFecha: this.toDateOnly(dto.proximaFecha),
        anticipacionDias: dto.anticipacionDias ?? 15,
        estaActiva: dto.estaActiva ?? true,
        empresaId: user.empresaId,
        createdBy: user.userId,
      }),
    );
    return this.withEstado(saved);
  }

  async findAll(
    user: AuthenticatedUser,
    filters: { estado?: string; activoId?: string },
  ) {
    if (
      filters.estado &&
      !['proxima', 'vencida', 'vigente'].includes(filters.estado)
    ) {
      throw new BadRequestException(
        'estado debe ser proxima, vencida o vigente',
      );
    }
    const rows = await this.repository.find({
      where: {
        empresaId: user.empresaId,
        ...(filters.activoId ? { activoId: filters.activoId } : {}),
      },
      order: { proximaFecha: 'ASC', createdAt: 'DESC' },
    });
    const result = rows.map((row) => this.withEstado(row));
    return filters.estado
      ? result.filter((row) => row.estado === filters.estado)
      : result;
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const row = await this.findEntity(id, user.empresaId);
    return this.withEstado(row);
  }

  async update(
    id: string,
    dto: UpdateProgramacionesMantenimientoDto,
    user: AuthenticatedUser,
  ) {
    const actual = await this.findEntity(id, user.empresaId);
    const activoId = dto.activoId ?? actual.activoId;
    const formularioId =
      dto.formularioId === undefined ? actual.formularioId : dto.formularioId;
    await this.validarReferencias(activoId, formularioId, user.empresaId);
    const quedaraActiva = dto.estaActiva ?? actual.estaActiva;
    if (quedaraActiva && (dto.nombre || dto.activoId || !actual.estaActiva)) {
      await this.validarNombreUnico(
        activoId,
        dto.nombre ?? actual.nombre,
        user.empresaId,
        id,
      );
    }
    const saved = await this.repository.save(
      this.repository.merge(actual, {
        ...dto,
        nombre: dto.nombre?.trim() ?? actual.nombre,
        descripcion:
          dto.descripcion === undefined
            ? actual.descripcion
            : dto.descripcion.trim(),
        proximaFecha: dto.proximaFecha
          ? this.toDateOnly(dto.proximaFecha)
          : actual.proximaFecha,
      }),
    );
    return this.withEstado(saved);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findEntity(id, user.empresaId);
    if (!actual.estaActiva) return;
    actual.estaActiva = false;
    await this.repository.save(actual);
  }

  async generarOrden(id: string, user: AuthenticatedUser) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const programaciones = manager.getRepository(ProgramacionMantenimiento);
        const programacion = await programaciones.findOne({
          where: { id, empresaId: user.empresaId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!programacion)
          throw new NotFoundException(`Programacion ${id} no encontrada`);
        if (!programacion.estaActiva)
          throw new BadRequestException('La programacion esta inactiva');
        if (this.deriveEstado(programacion) === 'vigente') {
          throw new BadRequestException(
            'La programacion aun no esta dentro de su ventana de anticipacion',
          );
        }

        const activos = manager.getRepository(Activo);
        const activo = await activos.findOne({
          where: {
            id: programacion.activoId,
            empresaId: user.empresaId,
            deletedAt: IsNull(),
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!activo)
          throw new NotFoundException(
            'Activo no encontrado para la empresa indicada',
          );
        if (
          ['dado_de_baja', 'desechado', 'perdido', 'robado'].includes(
            activo.estado,
          )
        ) {
          throw new BadRequestException(
            `No se puede generar mantenimiento para un activo en estado ${activo.estado}`,
          );
        }

        const reparaciones = manager.getRepository(ReparacionActivo);
        const activa = await reparaciones.findOne({
          where: {
            empresaId: user.empresaId,
            activoId: activo.id,
            estado: In(['abierta', 'en_proceso', 'esperando_repuestos']),
          },
          lock: { mode: 'pessimistic_read' },
        });
        if (activa)
          throw new ConflictException(
            'El equipo ya tiene una orden de taller activa',
          );

        const asignacionId = await this.resolverAsignacion(
          manager,
          activo.id,
          user.empresaId,
        );
        const ahora = new Date();
        const orden = await reparaciones.save(
          reparaciones.create({
            empresaId: user.empresaId,
            activoId: activo.id,
            asignacionId,
            programacionMantenimientoId: programacion.id,
            tipoServicio: 'mantenimiento',
            diagnostico: `Mantenimiento preventivo programado: ${programacion.nombre}`,
            fechaIngreso: ahora,
            estado: 'abierta',
            estadoActivoAnterior: activo.estado,
            creadoPor: user.userId,
            observaciones: programacion.descripcion ?? undefined,
          }),
        );

        activo.estado = 'en_reparacion';
        await activos.save(activo);
        await manager.getRepository(BitacoraAuditoriaSistema).save({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'MANTENIMIENTO_PREVENTIVO_GENERAR_ORDEN',
          entidad: 'programaciones_mantenimiento',
          entidadId: programacion.id,
          valoresNuevos: {
            reparacionId: orden.id,
            activoId: activo.id,
            proximaFechaAnterior: programacion.proximaFecha,
          },
          resultado: 'exito',
        });
        await manager.getRepository(OutboxEventoIntegracion).save({
          empresaId: user.empresaId,
          aggregateType: 'reparacion_activo',
          aggregateId: orden.id,
          eventType: 'orden_recibida',
          idempotencyKey: `orden_recibida:${orden.id}`,
          payloadJson: {
            reparacionId: orden.id,
            activoId: orden.activoId,
            asignacionId: orden.asignacionId,
            programacionMantenimientoId: programacion.id,
            estado: orden.estado,
          },
          estado: 'pendiente',
          intentos: 0,
          maxIntentos: 10,
        });

        programacion.ultimaEjecucionEn = ahora;
        programacion.ultimaReparacionId = orden.id;
        programacion.proximaFecha = this.addDays(
          programacion.proximaFecha,
          programacion.frecuenciaDias,
        );
        await programaciones.save(programacion);
        return orden;
      });
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException(
          'El equipo ya tiene una orden de taller activa',
        );
      }
      throw error;
    }
  }

  deriveEstado(
    programacion: Pick<
      ProgramacionMantenimiento,
      'proximaFecha' | 'anticipacionDias'
    >,
    today = new Date(),
  ): EstadoProgramacion {
    const hoy = this.startOfUtcDay(today);
    const proxima = this.parseDateOnly(programacion.proximaFecha);
    if (proxima.getTime() < hoy.getTime()) return 'vencida';
    const aviso = new Date(proxima);
    aviso.setUTCDate(aviso.getUTCDate() - programacion.anticipacionDias);
    return hoy.getTime() >= aviso.getTime() ? 'proxima' : 'vigente';
  }

  private withEstado(programacion: ProgramacionMantenimiento) {
    return { ...programacion, estado: this.deriveEstado(programacion) };
  }

  private async findEntity(id: string, empresaId: string) {
    const row = await this.repository.findOne({ where: { id, empresaId } });
    if (!row) throw new NotFoundException(`Programacion ${id} no encontrada`);
    return row;
  }

  private async validarReferencias(
    activoId: string,
    formularioId: string | null | undefined,
    empresaId: string,
  ) {
    const activo = await this.dataSource.getRepository(Activo).findOne({
      where: { id: activoId, empresaId, deletedAt: IsNull() },
    });
    if (!activo)
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
    if (formularioId) {
      const formulario = await this.dataSource
        .getRepository(Formulario)
        .findOne({ where: { id: formularioId, empresaId, estaActivo: true } });
      if (!formulario)
        throw new BadRequestException(
          'formularioId no existe, no pertenece al tenant o esta inactivo',
        );
    }
  }

  private async validarNombreUnico(
    activoId: string,
    nombre: string,
    empresaId: string,
    excludeId?: string,
  ) {
    const duplicate = await this.repository.findOne({
      where: {
        empresaId,
        activoId,
        estaActiva: true,
        nombre: Raw((column) => `lower(${column}) = lower(:nombre)`, {
          nombre: nombre.trim(),
        }),
      },
    });
    if (duplicate && duplicate.id !== excludeId) {
      throw new ConflictException(
        'Ya existe una programacion activa con ese nombre para el activo',
      );
    }
  }

  private async resolverAsignacion(
    manager: import('typeorm').EntityManager,
    activoId: string,
    empresaId: string,
  ) {
    const recurso = await manager.getRepository(AsignacionRecurso).findOne({
      where: { empresaId, activoId, estaActivo: true },
    });
    if (!recurso) return undefined;
    const asignacion = await manager.getRepository(Asignacion).findOne({
      where: { id: recurso.asignacionId, empresaId },
    });
    return asignacion &&
      !['cancelada', 'finalizada', 'rechazada'].includes(asignacion.estado)
      ? asignacion.id
      : undefined;
  }

  private toDateOnly(value: string): string {
    return this.parseDateOnly(value).toISOString().slice(0, 10);
  }

  private parseDateOnly(value: string): Date {
    const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()))
      throw new BadRequestException('proximaFecha no es valida');
    return date;
  }

  private startOfUtcDay(value: Date): Date {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }

  private addDays(value: string, days: number): string {
    const date = this.parseDateOnly(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
