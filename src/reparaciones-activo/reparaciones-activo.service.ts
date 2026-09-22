import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReparacionActivoDto } from './dto/create-reparacion-activo.dto';
import { UpdateReparacionActivoDto } from './dto/update-reparacion-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { ReparacionActivo } from './entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { HistorialComponentesActivo } from '../historial-componentes-activo/entities/historial-componentes-activo.entity';
import { ResolverReparacionActivoDto } from './dto/resolver-reparacion-activo.dto';

@Injectable()
export class ReparacionesActivoService {
  constructor(
    @InjectRepository(ReparacionActivo)
    private readonly reparacionesRepository: Repository<ReparacionActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly recursosRepository: Repository<AsignacionRecurso>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    await this.validarActivo(createDto.activoId, user.empresaId);
    this.validarFechas(createDto.fechaIngreso, createDto.fechaSalida);
    const activa = await this.reparacionesRepository.findOne({
      where: {
        empresaId: user.empresaId,
        activoId: createDto.activoId,
        estado: In(['abierta', 'en_proceso', 'esperando_repuestos']),
      },
    });
    if (activa) throw new BadRequestException('El equipo ya tiene una orden de taller activa');

    const asignacionId = await this.resolverAsignacion(
      createDto.activoId,
      createDto.asignacionId,
      user.empresaId,
    );

    const reparacion = this.reparacionesRepository.create({
      ...createDto,
      empresaId: user.empresaId,
      asignacionId,
      moneda: createDto.moneda?.toUpperCase(),
      fechaIngreso: new Date(createDto.fechaIngreso),
      fechaSalida: createDto.fechaSalida
        ? new Date(createDto.fechaSalida)
        : undefined,
      estado: createDto.estado ?? 'abierta',
      creadoPor: user.userId,
    });
    const saved = await this.reparacionesRepository.save(reparacion);

    await this.registrarBitacora(
      user,
      'REPARACIONES_ACTIVO_CREAR',
      'reparaciones_activo',
      saved.id,
      null,
      {
        activoId: saved.activoId,
        tipoServicio: saved.tipoServicio,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<ReparacionActivo[]> {
    return this.reparacionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    const reparacion = await this.reparacionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!reparacion) {
      throw new NotFoundException(`Reparacion ${id} no encontrada`);
    }

    return reparacion;
  }

  async update(
    id: string,
    updateDto: UpdateReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    if (['cerrada', 'cancelada'].includes(actual.estado)) {
      throw new BadRequestException('La orden cerrada o cancelada solo permite consulta');
    }
    if (updateDto.estado && !this.transicionesPermitidas(actual.estado).includes(updateDto.estado)) {
      throw new BadRequestException(`No se puede cambiar la orden de ${actual.estado} a ${updateDto.estado}`);
    }

    const fechaSalida = updateDto.fechaSalida
      ? new Date(updateDto.fechaSalida)
      : actual.fechaSalida;
    this.validarFechas(
      actual.fechaIngreso.toISOString(),
      fechaSalida?.toISOString(),
    );

    const payload = updateDto;
    const merged = this.reparacionesRepository.merge(actual, {
      ...payload,
      moneda: payload.moneda ? payload.moneda.toUpperCase() : actual.moneda,
      fechaSalida,
      estadoComunicacionDiagnostico:
        payload.diagnostico && payload.diagnostico !== actual.diagnostico
          ? 'pendiente'
          : actual.estadoComunicacionDiagnostico,
      diagnosticoComunicadoEn:
        payload.diagnostico && payload.diagnostico !== actual.diagnostico
          ? undefined
          : actual.diagnosticoComunicadoEn,
      diagnosticoComunicadoPor:
        payload.diagnostico && payload.diagnostico !== actual.diagnostico
          ? undefined
          : actual.diagnosticoComunicadoPor,
    });
    const saved = await this.reparacionesRepository.save(merged);

    await this.registrarBitacora(
      user,
      'REPARACIONES_ACTIVO_ACTUALIZAR',
      'reparaciones_activo',
      saved.id,
      {
        estado: actual.estado,
        resultado: actual.resultado ?? null,
      },
      {
        estado: saved.estado,
        resultado: saved.resultado ?? null,
      },
    );

    return saved;
  }

  async comunicarDiagnostico(id: string, user: AuthenticatedUser): Promise<ReparacionActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    if (['cerrada', 'cancelada'].includes(actual.estado)) {
      throw new BadRequestException('La orden cerrada o cancelada solo permite consulta');
    }
    actual.estadoComunicacionDiagnostico = 'comunicado';
    actual.diagnosticoComunicadoEn = new Date();
    actual.diagnosticoComunicadoPor = user.userId;
    const saved = await this.reparacionesRepository.save(actual);
    await this.registrarBitacora(user, 'REPARACIONES_DIAGNOSTICO_COMUNICADO', 'reparaciones_activo', id, null, {
      diagnosticoComunicadoEn: saved.diagnosticoComunicadoEn?.toISOString(),
    });
    return saved;
  }

  async resolver(
    id: string,
    dto: ResolverReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    return this.dataSource.transaction(async manager => {
      const reparaciones = manager.getRepository(ReparacionActivo);
      const actual = await reparaciones.findOne({ where: { id, empresaId: user.empresaId } });
      if (!actual) throw new NotFoundException(`Reparacion ${id} no encontrada`);
      if (['cerrada', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException('La orden cerrada o cancelada solo permite consulta');
      }
      this.validarFechas(actual.fechaIngreso.toISOString(), dto.fechaSalida);
      const atributos = manager.getRepository(AtributosDinamicosActivo);
      const historial = manager.getRepository(HistorialComponentesActivo);
      for (const cambio of dto.cambiosComponentes) {
        const existente = await atributos.findOne({
          where: { empresaId: user.empresaId, activoId: actual.activoId, clave: cambio.clave },
        });
        const valorAnterior = this.valorAtributo(existente);
        await historial.save(historial.create({
          empresaId: user.empresaId,
          activoId: actual.activoId,
          reparacionActivoId: actual.id,
          componenteClave: cambio.clave,
          componenteNombre: cambio.nombre,
          valorAnterior,
          valorNuevo: cambio.valorNuevo,
          unidadAnterior: existente?.unidad,
          unidadNueva: cambio.unidad,
          motivo: cambio.motivo,
          cambiadoEn: new Date(dto.fechaSalida),
          cambiadoPor: user.userId,
        }));
        const atributo = existente ?? atributos.create({
          empresaId: user.empresaId,
          activoId: actual.activoId,
          clave: cambio.clave,
        });
        atributo.valorTexto = cambio.valorNuevo;
        atributo.valorNumero = undefined;
        atributo.valorFecha = undefined;
        atributo.valorBooleano = undefined;
        atributo.unidad = cambio.unidad;
        await atributos.save(atributo);
      }
      actual.estado = 'cerrada';
      actual.resultado = dto.resultado;
      actual.resolucion = dto.resolucion;
      actual.fechaSalida = new Date(dto.fechaSalida);
      actual.observaciones = dto.observaciones ?? actual.observaciones;
      const saved = await reparaciones.save(actual);
      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion: 'REPARACIONES_ACTIVO_RESOLVER',
        entidad: 'reparaciones_activo',
        entidadId: saved.id,
        valoresAnteriores: { estado: actual.estado },
        valoresNuevos: { estado: 'cerrada', resultado: saved.resultado, cambiosComponentes: dto.cambiosComponentes.length },
        resultado: 'exito',
      }));
      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estado = 'cancelada';
    await this.reparacionesRepository.save(actual);

    await this.registrarBitacora(
      user,
      'REPARACIONES_ACTIVO_CANCELAR',
      'reparaciones_activo',
      actual.id,
      {
        estado: 'abierta',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private validarFechas(fechaIngreso: string, fechaSalida?: string): void {
    if (!fechaSalida) {
      return;
    }

    if (new Date(fechaSalida).getTime() < new Date(fechaIngreso).getTime()) {
      throw new BadRequestException(
        'La fecha de salida no puede ser anterior a la fecha de ingreso',
      );
    }
  }

  private transicionesPermitidas(estado: string): string[] {
    const mapa: Record<string, string[]> = {
      abierta: ['en_proceso', 'esperando_repuestos', 'cancelada'],
      en_proceso: ['esperando_repuestos', 'cancelada'],
      esperando_repuestos: ['en_proceso', 'cancelada'],
    };
    return mapa[estado] ?? [];
  }

  private async resolverAsignacion(activoId: string, asignacionId: string | undefined, empresaId: string): Promise<string | undefined> {
    const recurso = await this.recursosRepository.findOne({
      where: { empresaId, activoId, estaActivo: true, ...(asignacionId ? { asignacionId } : {}) },
    });
    if (asignacionId && !recurso) {
      throw new BadRequestException('La asignación indicada no contiene el equipo activo');
    }
    if (!recurso) return undefined;
    const asignacion = await this.asignacionesRepository.findOne({ where: { id: recurso.asignacionId, empresaId } });
    if (!asignacion || ['cancelada', 'finalizada', 'rechazada'].includes(asignacion.estado)) return undefined;
    return asignacion.id;
  }

  private valorAtributo(atributo?: AtributosDinamicosActivo | null): string | undefined {
    if (!atributo) return undefined;
    if (atributo.valorTexto != null) return atributo.valorTexto;
    if (atributo.valorNumero != null) return atributo.valorNumero;
    if (atributo.valorFecha != null) return atributo.valorFecha;
    if (atributo.valorBooleano != null) return atributo.valorBooleano ? 'Sí' : 'No';
    return undefined;
  }

  private async validarActivo(
    activoId: string,
    empresaId: string,
  ): Promise<void> {
    const activo = await this.activosRepository.findOne({
      where: {
        id: activoId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
    }
  }

  private async validarActor(user: AuthenticatedUser): Promise<void> {
    const actor = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!actor) {
      throw new NotFoundException(
        'Usuario actor no encontrado para la empresa indicada',
      );
    }
  }

  private async registrarBitacora(
    user: AuthenticatedUser,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }
}
