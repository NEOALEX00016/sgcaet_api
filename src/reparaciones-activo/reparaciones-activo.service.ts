import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateReparacionActivoDto } from './dto/create-reparacion-activo.dto';
import { UpdateReparacionActivoDto } from './dto/update-reparacion-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
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
import { ReservarRepuestoDto } from './dto/reservar-repuesto.dto';
import { LiberarRepuestoDto } from './dto/liberar-repuesto.dto';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { FormulariosReparacionService } from '../formularios-reparacion/formularios-reparacion.service';
import { CompletarFormularioReparacionDto } from '../formularios-reparacion/dto/create-formularios-reparacion.dto';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { createHash } from 'crypto';
import { FormularioReparacion } from '../formularios-reparacion/entities/formularios-reparacion.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

export type AssetTimelineEvent = {
  id: string;
  type: string;
  title: string;
  description: string;
  date: string;
  status?: string;
  actorId?: string;
  orderId?: string;
  metadata?: Record<string, unknown>;
};

@Injectable()
export class ReparacionesActivoService {
  constructor(
    @InjectRepository(ReparacionActivo)
    private readonly reparacionesRepository: Repository<ReparacionActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly recursosRepository: Repository<AsignacionRecurso>,
    private readonly formulariosReparacionService: FormulariosReparacionService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    this.validarFechas(createDto.fechaIngreso, createDto.fechaSalida);
    return this.dataSource.transaction(async (manager) => {
      const reparaciones = manager.getRepository(ReparacionActivo);
      const activos = manager.getRepository(Activo);
      const activo = await activos.findOne({
        where: {
          id: createDto.activoId,
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
          `No se puede enviar a taller un activo en estado ${activo.estado}`,
        );
      }
      const activa = await reparaciones.findOne({
        where: {
          empresaId: user.empresaId,
          activoId: createDto.activoId,
          estado: In(['abierta', 'en_proceso', 'esperando_repuestos']),
        },
      });
      if (activa)
        throw new BadRequestException(
          'El equipo ya tiene una orden de taller activa',
        );
      const asignacionId = await this.resolverAsignacionConManager(
        manager,
        createDto.activoId,
        createDto.asignacionId,
        user.empresaId,
      );
      const reparacion = reparaciones.create({
        ...createDto,
        empresaId: user.empresaId,
        asignacionId,
        moneda: createDto.moneda?.toUpperCase(),
        fechaIngreso: new Date(createDto.fechaIngreso),
        fechaSalida: createDto.fechaSalida
          ? new Date(createDto.fechaSalida)
          : undefined,
        estado: createDto.estado ?? 'abierta',
        estadoActivoAnterior: activo.estado,
        creadoPor: user.userId,
      });
      const saved = await reparaciones.save(reparacion);
      activo.estado = 'en_reparacion';
      await activos.save(activo);
      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(
        bitacora.create({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'REPARACIONES_ACTIVO_CREAR',
          entidad: 'reparaciones_activo',
          entidadId: saved.id,
          valoresNuevos: {
            activoId: saved.activoId,
            tipoServicio: saved.tipoServicio,
            estado: saved.estado,
            estadoActivo: activo.estado,
          },
          resultado: 'exito',
        }),
      );
      await this.publishWorkshopEvent(manager, saved, 'orden_recibida', {
        estado: saved.estado,
      });
      return saved;
    });
  }

  async findAll(user: AuthenticatedUser): Promise<ReparacionActivo[]> {
    return this.reparacionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOrdersReport(user: AuthenticatedUser) {
    const rows = await this.reparacionesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((row) => ({
      id: row.id,
      activoId: row.activoId,
      tipoServicio: row.tipoServicio,
      estado: row.estado,
      fechaIngreso: row.fechaIngreso,
      fechaSalida: row.fechaSalida,
      resultado: row.resultado,
      proveedorTecnico: row.proveedorTecnico,
      costo: row.costo,
      moneda: row.moneda,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
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

  async findAssetTimeline(
    activoId: string,
    user: AuthenticatedUser,
  ): Promise<AssetTimelineEvent[]> {
    const activo = await this.activosRepository.findOne({
      where: { id: activoId, empresaId: user.empresaId, deletedAt: IsNull() },
    });
    if (!activo) throw new NotFoundException('Activo no encontrado');

    const repairs = await this.reparacionesRepository.find({
      where: { empresaId: user.empresaId, activoId },
      order: { createdAt: 'DESC' },
    });
    const orderIds = repairs.map((repair) => repair.id);
    const resources = await this.recursosRepository.find({
      where: { empresaId: user.empresaId, activoId },
      order: { createdAt: 'DESC' },
    });
    const assignmentIds = [...new Set(resources.map((row) => row.asignacionId))];

    const [assignments, componentHistory, installedComponents, partMovements, repairForms, documents] =
      await Promise.all([
        assignmentIds.length
          ? this.asignacionesRepository.find({
              where: { empresaId: user.empresaId, id: In(assignmentIds) },
            })
          : Promise.resolve([]),
        this.dataSource.getRepository(HistorialComponentesActivo).find({
          where: { empresaId: user.empresaId, activoId },
        }),
        this.dataSource.getRepository(ComponenteInstaladoActivo).find({
          where: { empresaId: user.empresaId, activoId },
        }),
        this.dataSource.getRepository(MovimientoRepuesto).find({
          where: [
            { empresaId: user.empresaId, activoId },
            ...(orderIds.length
              ? [{ empresaId: user.empresaId, reparacionActivoId: In(orderIds) }]
              : []),
          ],
        }),
        orderIds.length
          ? this.dataSource.getRepository(FormularioReparacion).find({
              where: {
                empresaId: user.empresaId,
                reparacionActivoId: In(orderIds),
              },
            })
          : Promise.resolve([]),
        orderIds.length
          ? this.dataSource.getRepository(DocumentEntity).find({
              where: {
                empresaId: user.empresaId,
                entidadRelacionada: 'reparaciones_activo',
                entidadRelacionadaId: In(orderIds),
              },
            })
          : Promise.resolve([]),
      ]);

    const assignmentById = new Map(assignments.map((row) => [row.id, row]));
    const events: AssetTimelineEvent[] = [];
    for (const resource of resources) {
      const assignment = assignmentById.get(resource.asignacionId);
      if (!assignment) continue;
      events.push({
        id: `assignment:${resource.id}`,
        type: 'assignment',
        title: resource.estaActivo ? 'Equipo asignado' : 'Asignación histórica',
        description: assignment.motivo ?? assignment.observaciones ?? 'Vínculo del equipo con una asignación.',
        date: (resource.createdAt ?? assignment.fechaAsignacion).toISOString(),
        status: assignment.estado,
        actorId: assignment.entregadoPor ?? assignment.autorizadoPor,
        metadata: {
          assignmentId: assignment.id,
          personId: assignment.personaId,
          departmentId: assignment.departamentoId,
          locationId: assignment.ubicacionId,
          active: resource.estaActivo,
        },
      });
      if (assignment.fechaRealDevolucion) {
        events.push({
          id: `assignment-return:${resource.id}`,
          type: 'assignment_return',
          title: 'Equipo devuelto',
          description: assignment.observaciones ?? 'La asignación del equipo fue devuelta.',
          date: assignment.fechaRealDevolucion.toISOString(),
          status: assignment.estado,
          metadata: { assignmentId: assignment.id },
        });
      }
    }
    for (const repair of repairs) {
      events.push({
        id: `repair:${repair.id}`,
        type: 'repair',
        title: repair.tipoServicio === 'mantenimiento' ? 'Orden de mantenimiento' : 'Orden de reparación',
        description: repair.diagnostico,
        date: repair.fechaIngreso.toISOString(),
        status: repair.estado,
        actorId: repair.creadoPor,
        orderId: repair.id,
        metadata: { provider: repair.proveedorTecnico, cost: repair.costo, currency: repair.moneda },
      });
      if (repair.diagnosticoComunicadoEn) {
        events.push({
          id: `repair-diagnosis:${repair.id}`,
          type: 'repair_diagnosis',
          title: 'Diagnóstico comunicado',
          description: repair.diagnostico,
          date: repair.diagnosticoComunicadoEn.toISOString(),
          status: repair.estadoComunicacionDiagnostico,
          actorId: repair.diagnosticoComunicadoPor,
          orderId: repair.id,
        });
      }
      if (repair.fechaSalida) {
        events.push({
          id: `repair-result:${repair.id}`,
          type: 'repair_result',
          title: repair.estado === 'cancelada' ? 'Orden cancelada' : 'Orden finalizada',
          description: repair.resolucion ?? repair.observaciones ?? 'La orden de taller finalizó.',
          date: repair.fechaSalida.toISOString(),
          status: repair.resultado ?? repair.estado,
          orderId: repair.id,
        });
      }
    }
    for (const change of componentHistory) events.push({
      id: `component-change:${change.id}`,
      type: 'component_change',
      title: `Cambio de ${change.componenteNombre ?? change.componenteClave}`,
      description: `${change.valorAnterior ?? 'Sin valor'}${change.unidadAnterior ? ` ${change.unidadAnterior}` : ''} -> ${change.valorNuevo ?? 'Sin valor'}${change.unidadNueva ? ` ${change.unidadNueva}` : ''}`,
      date: change.cambiadoEn.toISOString(),
      actorId: change.cambiadoPor,
      orderId: change.reparacionActivoId,
      metadata: { reason: change.motivo, componentKey: change.componenteClave },
    });
    for (const component of installedComponents) {
      events.push({
        id: `component-installed:${component.id}`,
        type: 'component_installed',
        title: 'Componente instalado',
        description: [component.valor, component.unidad].filter(Boolean).join(' ') || 'Instalación registrada en el equipo.',
        date: component.instaladoEn.toISOString(),
        status: component.estado,
        actorId: component.instaladoPor,
        orderId: component.reparacionInstalacionId,
        metadata: { specificationId: component.especificacionTipoActivoId, partId: component.piezaRepuestoId, unitId: component.unidadRepuestoId, externalSerial: component.numeroSerieExterno },
      });
      if (component.retiradoEn) events.push({
        id: `component-removed:${component.id}`,
        type: 'component_removed',
        title: 'Componente retirado',
        description: [component.valor, component.unidad].filter(Boolean).join(' ') || 'Retiro registrado en el equipo.',
        date: component.retiradoEn.toISOString(),
        status: component.estado,
        orderId: component.reparacionRetiroId,
        metadata: { specificationId: component.especificacionTipoActivoId, partId: component.piezaRepuestoId, unitId: component.unidadRepuestoId },
      });
    }
    for (const movement of partMovements) events.push({
      id: `part-movement:${movement.id}`,
      type: 'part_movement',
      title: `Movimiento de repuesto: ${movement.tipoMovimiento}`,
      description: movement.motivo ?? `Cantidad ${movement.cantidad}`,
      date: movement.createdAt.toISOString(),
      status: movement.tipoMovimiento,
      actorId: movement.creadoPor,
      orderId: movement.reparacionActivoId,
      metadata: { partId: movement.piezaRepuestoId, unitId: movement.unidadRepuestoId, quantity: movement.cantidad, reference: movement.referencia },
    });
    for (const form of repairForms) events.push({
      id: `repair-form:${form.id}`,
      type: 'repair_form',
      title: `Formulario de ${form.etapa}`,
      description: form.estado === 'completado' ? 'Formulario de taller completado.' : 'Formulario de taller preparado.',
      date: (form.estado === 'completado' ? form.updatedAt : form.createdAt).toISOString(),
      status: form.estado,
      orderId: form.reparacionActivoId,
      metadata: { stage: form.etapa, formVersionId: form.formularioVersionId, responseId: form.formularioRespuestaId },
    });
    for (const document of documents) events.push({
      id: `document:${document.id}`,
      type: 'document',
      title: 'Documento de taller',
      description: document.originalName,
      date: document.createdAt.toISOString(),
      actorId: document.createdBy,
      orderId: document.entidadRelacionadaId,
      metadata: { mimeType: document.mimeType, sizeBytes: document.sizeBytes },
    });
    return events.sort((left, right) => Date.parse(right.date) - Date.parse(left.date));
  }

  async update(
    id: string,
    updateDto: UpdateReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ReparacionActivo);
      const actual = await repository.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Reparacion ${id} no encontrada`);
      if (['cerrada', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException(
          'La orden cerrada o cancelada solo permite consulta',
        );
      }
      if (
        updateDto.estado &&
        !this.transicionesPermitidas(actual.estado).includes(updateDto.estado)
      ) {
        throw new BadRequestException(
          `No se puede cambiar la orden de ${actual.estado} a ${updateDto.estado}`,
        );
      }
      if (actual.estado === 'abierta' && updateDto.estado === 'en_proceso') {
        await this.formulariosReparacionService.assertRequiredComplete(
          actual,
          'entrada',
          user.empresaId,
        );
      }

      const fechaSalida = updateDto.fechaSalida
        ? new Date(updateDto.fechaSalida)
        : actual.fechaSalida;
      this.validarFechas(
        actual.fechaIngreso.toISOString(),
        fechaSalida?.toISOString(),
      );

      const valoresAnteriores = {
        estado: actual.estado,
        resultado: actual.resultado ?? null,
      };
      const estadoAnterior = actual.estado;
      const payload = updateDto;
      const merged = repository.merge(actual, {
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
      const saved = await repository.save(merged);

      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(
        bitacora.create({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'REPARACIONES_ACTIVO_ACTUALIZAR',
          entidad: 'reparaciones_activo',
          entidadId: saved.id,
          valoresAnteriores,
          valoresNuevos: {
            estado: saved.estado,
            resultado: saved.resultado ?? null,
          },
          resultado: 'exito',
        }),
      );

      if (
        estadoAnterior !== 'esperando_repuestos' &&
        saved.estado === 'esperando_repuestos'
      ) {
        await this.publishWorkshopEvent(
          manager,
          saved,
          'esperando_repuestos',
          { estado: saved.estado },
          saved.updatedAt?.toISOString() ?? estadoAnterior,
        );
      }

      return saved;
    });
  }

  async comunicarDiagnostico(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ReparacionActivo);
      const actual = await repository.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Reparacion ${id} no encontrada`);
      if (['cerrada', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException(
          'La orden cerrada o cancelada solo permite consulta',
        );
      }
      if (actual.estadoComunicacionDiagnostico === 'comunicado') return actual;
      actual.estadoComunicacionDiagnostico = 'comunicado';
      actual.diagnosticoComunicadoEn = new Date();
      actual.diagnosticoComunicadoPor = user.userId;
      const saved = await repository.save(actual);
      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(
        bitacora.create({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'REPARACIONES_DIAGNOSTICO_COMUNICADO',
          entidad: 'reparaciones_activo',
          entidadId: id,
          valoresNuevos: {
            diagnosticoComunicadoEn:
              saved.diagnosticoComunicadoEn?.toISOString(),
          },
          resultado: 'exito',
        }),
      );
      const occurrence = createHash('sha256')
        .update(saved.diagnostico)
        .digest('hex')
        .slice(0, 24);
      await this.publishWorkshopEvent(
        manager,
        saved,
        'diagnostico_comunicado',
        { estado: saved.estado, diagnostico: saved.diagnostico },
        occurrence,
      );
      return saved;
    });
  }

  async reservarRepuesto(
    id: string,
    dto: ReservarRepuestoDto,
    user: AuthenticatedUser,
  ) {
    await this.validarActor(user);
    return this.dataSource.transaction(async (manager) => {
      const orden = await this.lockActiveOrder(manager, id, user.empresaId);
      const pieza = await this.lockApplicablePart(
        manager,
        dto.piezaRepuestoId,
        orden,
        user.empresaId,
      );
      const movimientos = manager.getRepository(MovimientoRepuesto);
      if (pieza.esSerializado) {
        if (!dto.unidadRepuestoId)
          throw new BadRequestException(
            'La pieza serializada requiere unidadRepuestoId',
          );
        if (dto.cantidad !== undefined && Number(dto.cantidad) !== 1)
          throw new BadRequestException(
            'La reserva serializada debe tener cantidad 1',
          );
        const unidades = manager.getRepository(UnidadRepuesto);
        const unidad = await unidades.findOne({
          where: {
            id: dto.unidadRepuestoId,
            piezaRepuestoId: pieza.id,
            empresaId: user.empresaId,
          },
          lock: { mode: 'pessimistic_write' },
        });
        if (!unidad || unidad.estado !== 'disponible')
          throw new BadRequestException(
            'La unidad serializada no está disponible',
          );
        unidad.estado = 'reservada';
        unidad.reparacionReservaId = orden.id;
        await unidades.save(unidad);
        return movimientos.save(
          movimientos.create(
            this.movementData(
              orden,
              pieza,
              user,
              'reserva',
              1,
              dto.motivo,
              unidad.id,
            ),
          ),
        );
      }
      if (dto.unidadRepuestoId)
        throw new BadRequestException(
          'La pieza no serializada no acepta unidadRepuestoId',
        );
      const cantidad = this.positive(dto.cantidad);
      const stock = await this.lockStock(manager, pieza, false);
      const disponibleAnterior = Number(stock.cantidadDisponible);
      if (disponibleAnterior < cantidad)
        throw new BadRequestException(
          'STOCK_INSUFICIENTE: cantidad disponible insuficiente',
        );
      stock.cantidadDisponible = this.decimal(disponibleAnterior - cantidad);
      stock.cantidadReservada = this.decimal(
        Number(stock.cantidadReservada) + cantidad,
      );
      await manager.getRepository(ExistenciaRepuesto).save(stock);
      return movimientos.save(
        movimientos.create({
          ...this.movementData(
            orden,
            pieza,
            user,
            'reserva',
            cantidad,
            dto.motivo,
          ),
          saldoAnterior: this.decimal(disponibleAnterior),
          saldoNuevo: stock.cantidadDisponible,
        }),
      );
    });
  }

  async liberarRepuesto(
    id: string,
    dto: LiberarRepuestoDto,
    user: AuthenticatedUser,
  ) {
    await this.validarActor(user);
    return this.dataSource.transaction((manager) =>
      this.releaseReservation(manager, id, dto, user),
    );
  }

  async findRepuestos(id: string, user: AuthenticatedUser) {
    await this.findOne(id, user);
    return this.dataSource.getRepository(MovimientoRepuesto).find({
      where: { empresaId: user.empresaId, reparacionActivoId: id },
      order: { createdAt: 'ASC' },
    });
  }

  async resolver(
    id: string,
    dto: ResolverReparacionActivoDto,
    user: AuthenticatedUser,
  ): Promise<ReparacionActivo> {
    await this.validarActor(user);
    return this.dataSource.transaction(async (manager) => {
      const reparaciones = manager.getRepository(ReparacionActivo);
      const actual = await reparaciones.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Reparacion ${id} no encontrada`);
      if (['cerrada', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException(
          'La orden cerrada o cancelada solo permite consulta',
        );
      }
      await this.formulariosReparacionService.assertRequiredComplete(
        actual,
        'salida',
        user.empresaId,
        manager,
      );
      this.validarFechas(actual.fechaIngreso.toISOString(), dto.fechaSalida);
      const atributos = manager.getRepository(AtributosDinamicosActivo);
      const historial = manager.getRepository(HistorialComponentesActivo);
      const estadoAnterior = actual.estado;
      const reservados = await this.outstandingReservations(
        manager,
        actual,
        user.empresaId,
      );
      this.validateClientReservations(dto.repuestosReservados, reservados);
      for (const reservado of reservados) {
        await this.consumeAndInstall(
          manager,
          actual,
          reservado,
          user,
          new Date(dto.fechaSalida),
        );
      }
      if (
        (await this.outstandingReservations(manager, actual, user.empresaId))
          .length > 0
      ) {
        throw new BadRequestException(
          'No se puede cerrar la orden con reservas pendientes',
        );
      }
      for (const cambio of dto.cambiosComponentes ?? []) {
        const existente = await atributos.findOne({
          where: {
            empresaId: user.empresaId,
            activoId: actual.activoId,
            clave: cambio.clave,
          },
        });
        const valorAnterior = this.valorAtributo(existente);
        await historial.save(
          historial.create({
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
          }),
        );
        const atributo =
          existente ??
          atributos.create({
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
      await this.restaurarEstadoActivo(manager, actual, user.empresaId);
      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(
        bitacora.create({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'REPARACIONES_ACTIVO_RESOLVER',
          entidad: 'reparaciones_activo',
          entidadId: saved.id,
          valoresAnteriores: { estado: estadoAnterior },
          valoresNuevos: {
            estado: 'cerrada',
            resultado: saved.resultado,
            cambiosComponentes: dto.cambiosComponentes?.length ?? 0,
            repuestosConsumidos: reservados.length,
          },
          resultado: 'exito',
        }),
      );
      await this.publishWorkshopEvent(manager, saved, 'orden_resuelta', {
        estado: saved.estado,
        resultado: saved.resultado,
        resolucion: saved.resolucion,
      });
      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.validarActor(user);
    await this.dataSource.transaction(async (manager) => {
      const reparaciones = manager.getRepository(ReparacionActivo);
      const actual = await reparaciones.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Reparacion ${id} no encontrada`);
      if (['cerrada', 'cancelada'].includes(actual.estado)) {
        throw new BadRequestException(
          'La orden cerrada o cancelada solo permite consulta',
        );
      }
      const estadoAnterior = actual.estado;
      await this.releaseAllReservations(manager, actual, user);
      actual.estado = 'cancelada';
      await reparaciones.save(actual);
      await this.restaurarEstadoActivo(manager, actual, user.empresaId);
      const bitacora = manager.getRepository(BitacoraAuditoriaSistema);
      await bitacora.save(
        bitacora.create({
          empresaId: user.empresaId,
          usuarioActorId: user.userId,
          accion: 'REPARACIONES_ACTIVO_CANCELAR',
          entidad: 'reparaciones_activo',
          entidadId: actual.id,
          valoresAnteriores: { estado: estadoAnterior },
          valoresNuevos: { estado: actual.estado },
          resultado: 'exito',
        }),
      );
    });
  }

  prepararFormulario(id: string, etapa: string, user: AuthenticatedUser) {
    return this.formulariosReparacionService.prepare(id, etapa, user);
  }

  findFormularios(id: string, user: AuthenticatedUser) {
    return this.formulariosReparacionService.findByRepair(id, user);
  }

  completarFormulario(
    id: string,
    instanciaId: string,
    dto: CompletarFormularioReparacionDto,
    user: AuthenticatedUser,
  ) {
    return this.formulariosReparacionService.complete(
      id,
      instanciaId,
      dto,
      user,
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
      abierta: ['en_proceso', 'esperando_repuestos'],
      en_proceso: ['esperando_repuestos'],
      esperando_repuestos: ['en_proceso'],
    };
    return mapa[estado] ?? [];
  }

  private async resolverAsignacion(
    activoId: string,
    asignacionId: string | undefined,
    empresaId: string,
  ): Promise<string | undefined> {
    const recurso = await this.recursosRepository.findOne({
      where: {
        empresaId,
        activoId,
        estaActivo: true,
        ...(asignacionId ? { asignacionId } : {}),
      },
    });
    if (asignacionId && !recurso) {
      throw new BadRequestException(
        'La asignación indicada no contiene el equipo activo',
      );
    }
    if (!recurso) return undefined;
    const asignacion = await this.asignacionesRepository.findOne({
      where: { id: recurso.asignacionId, empresaId },
    });
    if (
      !asignacion ||
      ['cancelada', 'finalizada', 'rechazada'].includes(asignacion.estado)
    )
      return undefined;
    return asignacion.id;
  }

  private async resolverAsignacionConManager(
    manager: EntityManager,
    activoId: string,
    asignacionId: string | undefined,
    empresaId: string,
  ): Promise<string | undefined> {
    const recurso = await manager.getRepository(AsignacionRecurso).findOne({
      where: {
        empresaId,
        activoId,
        estaActivo: true,
        ...(asignacionId ? { asignacionId } : {}),
      },
    });
    if (asignacionId && !recurso) {
      throw new BadRequestException(
        'La asignación indicada no contiene el equipo activo',
      );
    }
    if (!recurso) return undefined;
    const asignacion = await manager.getRepository(Asignacion).findOne({
      where: { id: recurso.asignacionId, empresaId },
    });
    if (
      !asignacion ||
      ['cancelada', 'finalizada', 'rechazada'].includes(asignacion.estado)
    )
      return undefined;
    return asignacion.id;
  }

  private async restaurarEstadoActivo(
    manager: EntityManager,
    reparacion: ReparacionActivo,
    empresaId: string,
  ): Promise<void> {
    const activos = manager.getRepository(Activo);
    const activo = await activos.findOne({
      where: { id: reparacion.activoId, empresaId, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!activo || activo.estado !== 'en_reparacion') return;
    const recurso = await manager.getRepository(AsignacionRecurso).findOne({
      where: { empresaId, activoId: reparacion.activoId, estaActivo: true },
    });
    const asignacion = recurso
      ? await manager
          .getRepository(Asignacion)
          .findOne({ where: { id: recurso.asignacionId, empresaId } })
      : undefined;
    activo.estado =
      asignacion &&
      !['cancelada', 'finalizada', 'rechazada'].includes(asignacion.estado)
        ? 'asignado'
        : (reparacion.estadoActivoAnterior ?? 'registrado');
    await activos.save(activo);
  }

  private async lockActiveOrder(
    manager: EntityManager,
    id: string,
    empresaId: string,
  ) {
    const orden = await manager.getRepository(ReparacionActivo).findOne({
      where: { id, empresaId },
      lock: { mode: 'pessimistic_write' },
    });
    if (!orden) throw new NotFoundException(`Reparacion ${id} no encontrada`);
    if (
      !['abierta', 'en_proceso', 'esperando_repuestos'].includes(orden.estado)
    ) {
      throw new BadRequestException('La orden no está activa');
    }
    return orden;
  }

  private async lockApplicablePart(
    manager: EntityManager,
    piezaId: string,
    orden: ReparacionActivo,
    empresaId: string,
    requireActive = true,
  ) {
    const pieza = await manager.getRepository(PiezaRepuesto).findOne({
      where: {
        id: piezaId,
        empresaId,
        ...(requireActive ? { estaActiva: true } : {}),
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (!pieza) throw new NotFoundException('Pieza de repuesto no encontrada');
    const activo = await manager
      .getRepository(Activo)
      .findOne({ where: { id: orden.activoId, empresaId } });
    if (!activo) throw new NotFoundException('Activo no encontrado');
    const tipo = await manager
      .getRepository(TiposActivo)
      .findOne({ where: { id: activo.tipoActivoId, empresaId } });
    const especificacion = await manager
      .getRepository(EspecificacionTipoActivo)
      .findOne({
        where: { id: pieza.especificacionTipoActivoId, empresaId },
      });
    if (
      !tipo ||
      !especificacion ||
      (especificacion.tipoActivoId !== activo.tipoActivoId &&
        (!tipo.categoriaEquipoId ||
          especificacion.categoriaEquipoId !== tipo.categoriaEquipoId))
    )
      throw new BadRequestException(
        'La pieza no aplica a la categoría o tipo del activo',
      );
    return pieza;
  }

  private async lockStock(
    manager: EntityManager,
    pieza: PiezaRepuesto,
    allowMissing: boolean,
  ) {
    const repo = manager.getRepository(ExistenciaRepuesto);
    const stock = await repo.findOne({
      where: { empresaId: pieza.empresaId, piezaRepuestoId: pieza.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!stock && !allowMissing)
      throw new BadRequestException(
        'STOCK_INSUFICIENTE: no existe saldo para la pieza',
      );
    return stock!;
  }

  private async outstanding(
    manager: EntityManager,
    orderId: string,
    pieceId: string,
    unitId?: string,
  ) {
    const rows = await manager.getRepository(MovimientoRepuesto).find({
      where: {
        reparacionActivoId: orderId,
        piezaRepuestoId: pieceId,
        ...(unitId ? { unidadRepuestoId: unitId } : {}),
      },
    });
    return rows.reduce(
      (total, row) =>
        total +
        (row.tipoMovimiento === 'reserva'
          ? Number(row.cantidad)
          : ['liberacion', 'consumo'].includes(row.tipoMovimiento)
            ? -Number(row.cantidad)
            : 0),
      0,
    );
  }

  private async releaseReservation(
    manager: EntityManager,
    id: string,
    dto: LiberarRepuestoDto,
    user: AuthenticatedUser,
  ) {
    const orden = await this.lockActiveOrder(manager, id, user.empresaId);
    const pieza = await this.lockApplicablePart(
      manager,
      dto.piezaRepuestoId,
      orden,
      user.empresaId,
      false,
    );
    const movements = manager.getRepository(MovimientoRepuesto);
    if (pieza.esSerializado) {
      if (!dto.unidadRepuestoId)
        throw new BadRequestException(
          'La pieza serializada requiere unidadRepuestoId',
        );
      if (dto.cantidad !== undefined && Number(dto.cantidad) !== 1)
        throw new BadRequestException(
          'La liberación serializada debe tener cantidad 1',
        );
      const unidades = manager.getRepository(UnidadRepuesto);
      const unidad = await unidades.findOne({
        where: {
          id: dto.unidadRepuestoId,
          piezaRepuestoId: pieza.id,
          empresaId: user.empresaId,
        },
        lock: { mode: 'pessimistic_write' },
      });
      if (
        !unidad ||
        unidad.estado !== 'reservada' ||
        unidad.reparacionReservaId !== orden.id
      )
        throw new BadRequestException(
          'La unidad no está reservada por esta orden',
        );
      unidad.estado = 'disponible';
      unidad.reparacionReservaId = undefined;
      await unidades.save(unidad);
      return movements.save(
        movements.create(
          this.movementData(
            orden,
            pieza,
            user,
            'liberacion',
            1,
            dto.motivo,
            unidad.id,
          ),
        ),
      );
    }
    const cantidad = this.positive(dto.cantidad);
    const pending = await this.outstanding(manager, orden.id, pieza.id);
    if (pending < cantidad)
      throw new BadRequestException('La orden no tiene esa cantidad reservada');
    const stock = await this.lockStock(manager, pieza, false);
    const reservadaAnterior = Number(stock.cantidadReservada);
    if (reservadaAnterior < cantidad)
      throw new BadRequestException('El saldo reservado es inconsistente');
    stock.cantidadReservada = this.decimal(reservadaAnterior - cantidad);
    stock.cantidadDisponible = this.decimal(
      Number(stock.cantidadDisponible) + cantidad,
    );
    await manager.getRepository(ExistenciaRepuesto).save(stock);
    return movements.save(
      movements.create({
        ...this.movementData(
          orden,
          pieza,
          user,
          'liberacion',
          cantidad,
          dto.motivo,
        ),
        saldoAnterior: this.decimal(reservadaAnterior),
        saldoNuevo: stock.cantidadReservada,
      }),
    );
  }

  private async consumeAndInstall(
    manager: EntityManager,
    orden: ReparacionActivo,
    dto: {
      piezaRepuestoId: string;
      unidadRepuestoId?: string;
      cantidad?: string;
    },
    user: AuthenticatedUser,
    installedAt: Date,
  ) {
    const pieza = await this.lockApplicablePart(
      manager,
      dto.piezaRepuestoId,
      orden,
      user.empresaId,
      false,
    );
    const specification = await manager
      .getRepository(EspecificacionTipoActivo)
      .findOne({
        where: {
          id: pieza.especificacionTipoActivoId,
          empresaId: user.empresaId,
        },
      });
    if (!specification)
      throw new NotFoundException('Especificación de la pieza no encontrada');
    let cantidad = 1;
    let unidad: UnidadRepuesto | undefined;
    if (pieza.esSerializado) {
      if (!dto.unidadRepuestoId)
        throw new BadRequestException(
          'La pieza serializada requiere unidadRepuestoId',
        );
      if (dto.cantidad !== undefined && Number(dto.cantidad) !== 1)
        throw new BadRequestException(
          'El consumo serializado debe tener cantidad 1',
        );
      const unidades = manager.getRepository(UnidadRepuesto);
      unidad =
        (await unidades.findOne({
          where: {
            id: dto.unidadRepuestoId,
            piezaRepuestoId: pieza.id,
            empresaId: user.empresaId,
          },
          lock: { mode: 'pessimistic_write' },
        })) ?? undefined;
      if (
        !unidad ||
        unidad.estado !== 'reservada' ||
        unidad.reparacionReservaId !== orden.id
      )
        throw new BadRequestException(
          'La unidad no está reservada por esta orden',
        );
      unidad.estado = 'instalada';
      unidad.reparacionReservaId = undefined;
      unidad.activoInstaladoId = orden.activoId;
      await unidades.save(unidad);
    } else {
      cantidad = this.positive(dto.cantidad);
      if ((await this.outstanding(manager, orden.id, pieza.id)) < cantidad)
        throw new BadRequestException(
          'La orden no tiene esa cantidad reservada',
        );
      const stock = await this.lockStock(manager, pieza, false);
      if (Number(stock.cantidadReservada) < cantidad)
        throw new BadRequestException('El saldo reservado es inconsistente');
      stock.cantidadReservada = this.decimal(
        Number(stock.cantidadReservada) - cantidad,
      );
      await manager.getRepository(ExistenciaRepuesto).save(stock);
    }
    const componentes = manager.getRepository(ComponenteInstaladoActivo);
    const previous = await componentes.findOne({
      where: {
        empresaId: user.empresaId,
        activoId: orden.activoId,
        especificacionTipoActivoId: pieza.especificacionTipoActivoId,
        estado: 'instalado',
      },
      lock: { mode: 'pessimistic_write' },
    });
    if (previous) {
      previous.estado = 'retirado';
      previous.retiradoEn = installedAt;
      previous.reparacionRetiroId = orden.id;
      await componentes.save(previous);
      if (previous.unidadRepuestoId) {
        const unidades = manager.getRepository(UnidadRepuesto);
        const priorUnit = await unidades.findOne({
          where: { id: previous.unidadRepuestoId, empresaId: user.empresaId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!priorUnit)
          throw new BadRequestException(
            'La unidad física del componente anterior no existe',
          );
        // Sin una disposición explícita en el contrato, una unidad sustituida se conserva como defectuosa.
        priorUnit.estado = 'defectuosa';
        priorUnit.activoInstaladoId = undefined;
        priorUnit.reparacionReservaId = undefined;
        await unidades.save(priorUnit);
        await manager.getRepository(MovimientoRepuesto).save(
          manager.getRepository(MovimientoRepuesto).create({
            empresaId: user.empresaId,
            piezaRepuestoId: priorUnit.piezaRepuestoId,
            unidadRepuestoId: priorUnit.id,
            reparacionActivoId: orden.id,
            activoId: orden.activoId,
            tipoMovimiento: 'devolucion',
            cantidad: this.decimal(1),
            motivo:
              'Retiro de unidad sustituida; disposición conservadora: defectuosa',
            creadoPor: user.userId,
          }),
        );
      }
    }
    const value =
      pieza.capacidad ??
      (pieza.esSerializado ? unidad!.numeroSerie : this.decimal(cantidad));
    await componentes.save(
      componentes.create({
        empresaId: user.empresaId,
        activoId: orden.activoId,
        especificacionTipoActivoId: pieza.especificacionTipoActivoId,
        piezaRepuestoId: pieza.id,
        unidadRepuestoId: unidad?.id,
        valor: value,
        unidad: pieza.unidad,
        estado: 'instalado',
        instaladoEn: installedAt,
        instaladoPor: user.userId,
        reparacionInstalacionId: orden.id,
      }),
    );
    await manager
      .getRepository(MovimientoRepuesto)
      .save(
        manager
          .getRepository(MovimientoRepuesto)
          .create(
            this.movementData(
              orden,
              pieza,
              user,
              'consumo',
              cantidad,
              'Consumo al resolver orden',
              unidad?.id,
            ),
          ),
      );
    await this.updateTechnicalHistory(
      manager,
      orden,
      specification,
      pieza,
      value,
      user,
      installedAt,
    );
  }

  private async updateTechnicalHistory(
    manager: EntityManager,
    orden: ReparacionActivo,
    specification: EspecificacionTipoActivo,
    pieza: PiezaRepuesto,
    value: string,
    user: AuthenticatedUser,
    changedAt: Date,
  ) {
    const atributos = manager.getRepository(AtributosDinamicosActivo);
    const actual = await atributos.findOne({
      where: {
        empresaId: user.empresaId,
        activoId: orden.activoId,
        clave: specification.clave,
      },
    });
    const previousValue = this.valorAtributo(actual);
    const previousUnit = actual?.unidad;
    const attribute =
      actual ??
      atributos.create({
        empresaId: user.empresaId,
        activoId: orden.activoId,
        clave: specification.clave,
      });
    attribute.valorTexto = value;
    attribute.valorNumero = undefined;
    attribute.valorFecha = undefined;
    attribute.valorBooleano = undefined;
    attribute.unidad = pieza.unidad ?? specification.unidad;
    await atributos.save(attribute);
    const historial = manager.getRepository(HistorialComponentesActivo);
    await historial.save(
      historial.create({
        empresaId: user.empresaId,
        activoId: orden.activoId,
        reparacionActivoId: orden.id,
        componenteClave: specification.clave,
        componenteNombre: specification.nombre,
        valorAnterior: previousValue,
        valorNuevo: value,
        unidadAnterior: previousUnit,
        unidadNueva: attribute.unidad,
        motivo: `Instalación de repuesto ${pieza.codigo}`,
        cambiadoEn: changedAt,
        cambiadoPor: user.userId,
      }),
    );
  }

  private async releaseAllReservations(
    manager: EntityManager,
    orden: ReparacionActivo,
    user: AuthenticatedUser,
  ) {
    const units = await manager.getRepository(UnidadRepuesto).find({
      where: {
        empresaId: user.empresaId,
        reparacionReservaId: orden.id,
        estado: 'reservada',
      },
      lock: { mode: 'pessimistic_write' },
    });
    for (const unit of units)
      await this.releaseReservation(
        manager,
        orden.id,
        {
          piezaRepuestoId: unit.piezaRepuestoId,
          unidadRepuestoId: unit.id,
          motivo: 'Cancelación de orden',
        },
        user,
      );
    const reservations = await manager.getRepository(MovimientoRepuesto).find({
      where: { empresaId: user.empresaId, reparacionActivoId: orden.id },
    });
    const pieceIds = [
      ...new Set(
        reservations
          .filter((row) => !row.unidadRepuestoId)
          .map((row) => row.piezaRepuestoId),
      ),
    ];
    for (const pieceId of pieceIds) {
      const pending = await this.outstanding(manager, orden.id, pieceId);
      if (pending > 0)
        await this.releaseReservation(
          manager,
          orden.id,
          {
            piezaRepuestoId: pieceId,
            cantidad: this.decimal(pending),
            motivo: 'Cancelación de orden',
          },
          user,
        );
    }
  }

  private async outstandingReservations(
    manager: EntityManager,
    orden: ReparacionActivo,
    empresaId: string,
  ) {
    const units = await manager.getRepository(UnidadRepuesto).find({
      where: { empresaId, reparacionReservaId: orden.id, estado: 'reservada' },
      lock: { mode: 'pessimistic_write' },
    });
    const movements = await manager.getRepository(MovimientoRepuesto).find({
      where: { empresaId, reparacionActivoId: orden.id },
      order: { createdAt: 'ASC' },
    });
    const quantities = new Map<string, number>();
    for (const movement of movements) {
      if (movement.unidadRepuestoId) continue;
      const direction =
        movement.tipoMovimiento === 'reserva'
          ? 1
          : ['liberacion', 'consumo'].includes(movement.tipoMovimiento)
            ? -1
            : 0;
      quantities.set(
        movement.piezaRepuestoId,
        (quantities.get(movement.piezaRepuestoId) ?? 0) +
          direction * Number(movement.cantidad),
      );
    }
    return [
      ...units.map((unit) => ({
        piezaRepuestoId: unit.piezaRepuestoId,
        unidadRepuestoId: unit.id,
      })),
      ...[...quantities.entries()]
        .filter(([, quantity]) => quantity > 0)
        .map(([piezaRepuestoId, quantity]) => ({
          piezaRepuestoId,
          cantidad: this.decimal(quantity),
        })),
    ];
  }

  private validateClientReservations(
    supplied: ResolverReparacionActivoDto['repuestosReservados'],
    authoritative: Array<{
      piezaRepuestoId: string;
      unidadRepuestoId?: string;
      cantidad?: string;
    }>,
  ): void {
    if (supplied === undefined) return;
    const key = (item: {
      piezaRepuestoId: string;
      unidadRepuestoId?: string;
    }) => `${item.piezaRepuestoId}:${item.unidadRepuestoId ?? ''}`;
    if (new Set(supplied.map(key)).size !== supplied.length) {
      throw new BadRequestException(
        'repuestosReservados contiene entradas duplicadas',
      );
    }
    const expected = new Map(
      authoritative.map((item) => [key(item), Number(item.cantidad ?? 1)]),
    );
    const received = new Map(
      supplied.map((item) => [key(item), Number(item.cantidad ?? 1)]),
    );
    if (
      expected.size !== received.size ||
      [...expected].some(
        ([itemKey, quantity]) => received.get(itemKey) !== quantity,
      )
    ) {
      throw new BadRequestException(
        'repuestosReservados está desactualizado respecto de las reservas activas de la orden',
      );
    }
  }

  private movementData(
    orden: ReparacionActivo,
    pieza: PiezaRepuesto,
    user: AuthenticatedUser,
    type: 'reserva' | 'liberacion' | 'consumo',
    quantity: number,
    reason?: string,
    unitId?: string,
  ) {
    return {
      empresaId: user.empresaId,
      piezaRepuestoId: pieza.id,
      unidadRepuestoId: unitId,
      reparacionActivoId: orden.id,
      activoId: orden.activoId,
      tipoMovimiento: type,
      cantidad: this.decimal(quantity),
      motivo: reason,
      creadoPor: user.userId,
    };
  }

  private positive(value?: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0)
      throw new BadRequestException('La cantidad debe ser mayor que cero');
    return parsed;
  }

  private decimal(value: number) {
    return value.toFixed(4);
  }

  private valorAtributo(
    atributo?: AtributosDinamicosActivo | null,
  ): string | undefined {
    if (!atributo) return undefined;
    if (atributo.valorTexto != null) return atributo.valorTexto;
    if (atributo.valorNumero != null) return atributo.valorNumero;
    if (atributo.valorFecha != null) return atributo.valorFecha;
    if (atributo.valorBooleano != null)
      return atributo.valorBooleano ? 'Sí' : 'No';
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

  private async publishWorkshopEvent(
    manager: EntityManager,
    order: ReparacionActivo,
    eventType:
      | 'orden_recibida'
      | 'diagnostico_comunicado'
      | 'esperando_repuestos'
      | 'orden_resuelta',
    payload: Record<string, unknown>,
    occurrence?: string,
  ): Promise<void> {
    const repository = manager.getRepository(OutboxEventoIntegracion);
    const idempotencyKey = `${eventType}:${order.id}${occurrence ? `:${occurrence}` : ''}`;
    const existing = await repository.findOne({
      where: { empresaId: order.empresaId, idempotencyKey },
    });
    if (existing) return;
    await repository.save(
      repository.create({
        empresaId: order.empresaId,
        aggregateType: 'reparacion_activo',
        aggregateId: order.id,
        eventType,
        idempotencyKey,
        payloadJson: {
          reparacionId: order.id,
          activoId: order.activoId,
          asignacionId: order.asignacionId,
          ...payload,
        },
        estado: 'pendiente',
        intentos: 0,
        maxIntentos: 10,
      }),
    );
  }
}
