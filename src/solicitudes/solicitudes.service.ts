import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Solicitud } from './entities/solicitud.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ConfiguracionSolicitudesService } from '../configuracion-solicitudes/configuracion-solicitudes.service';
import { DominiosCatalogoActivosService } from '../dominios-catalogo-activos/dominios-catalogo-activos.service';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { UpdateEstadoSolicitudDto } from './dto/update-estado-solicitud.dto';
import { AsignacionesService } from '../asignaciones/asignaciones.service';
import { ConvertirASolicitudAsignacionDto } from './dto/convertir-a-asignacion.dto';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { PrestamosActivoService } from '../prestamos-activo/prestamos-activo.service';
import { ReparacionesActivoService } from '../reparaciones-activo/reparaciones-activo.service';
import { PrestamoActivo } from '../prestamos-activo/entities/prestamos-activo.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { ConvertirASolicitudPrestamoDto } from './dto/convertir-a-prestamo.dto';
import { ConvertirASolicitudReparacionDto } from './dto/convertir-a-reparacion.dto';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { Persona } from '../personas/entities/persona.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { randomUUID } from 'crypto';
import { CreateSolicitudMixtaDto } from './dto/create-solicitud-mixta.dto';

@Injectable()
export class SolicitudesService {
  constructor(
    @InjectRepository(Solicitud)
    private readonly solicitudesRepository: Repository<Solicitud>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    private readonly configuracionService: ConfiguracionSolicitudesService,
    private readonly dominiosService: DominiosCatalogoActivosService,
    private readonly asignacionesService: AsignacionesService,
    private readonly prestamosActivoService: PrestamosActivoService,
    private readonly reparacionesActivoService: ReparacionesActivoService,
    @InjectRepository(UsuarioRol) private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso) private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso) private readonly permisosRepository: Repository<Permiso>,
  ) {}

  async create(
    dto: CreateSolicitudDto,
    user: AuthenticatedUser,
  ): Promise<Solicitud> {
    const usuario = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        estado: 'activo',
        deletedAt: IsNull(),
      },
    });
    if (!usuario)
      throw new BadRequestException(
        'Usuario no disponible para crear solicitudes',
      );
    const personaId = dto.personaId ?? usuario.personaId;
    if (!personaId) {
      throw new BadRequestException(
        'No existe persona vinculada para crear la solicitud',
      );
    }

    const persona = await this.personasRepository.findOne({
      where: {
        id: personaId,
        empresaId: user.empresaId,
        estado: 'activo',
        deletedAt: IsNull(),
      },
    });
    if (!persona) {
      throw new BadRequestException(
        'personaId no corresponde a una persona activa del tenant',
      );
    }

    if (dto.origen === 'externa' && !dto.referenciaExterna)
      throw new BadRequestException(
        'Una solicitud externa requiere referenciaExterna',
      );
    if (dto.origen === 'externa' && !dto.canalEntrada)
      throw new BadRequestException(
        'Una solicitud externa requiere canalEntrada',
      );
    this.validarCombinacionSolicitud(dto);
    await this.configuracionService.assertAllowed(
      user.empresaId,
      dto.recursoTipo,
    );
    if (dto.recursoTipo === 'recarga_minutos')
      await this.dominiosService.assertTelecomCapability(
        user.empresaId,
        'manejaMinutos',
      );
    if (dto.recursoTipo === 'paquete_datos')
      await this.dominiosService.assertTelecomCapability(
        user.empresaId,
        'manejaDatos',
      );
    if (dto.recursoTipo === 'sms')
      await this.dominiosService.assertTelecomCapability(
        user.empresaId,
        'manejaSms',
      );
    const desdeEn = dto.desdeEn ? new Date(dto.desdeEn) : undefined;
    const hastaEn = dto.hastaEn ? new Date(dto.hastaEn) : undefined;
    if (desdeEn && hastaEn && hastaEn < desdeEn)
      throw new BadRequestException(
        'La fecha hastaEn no puede ser anterior a desdeEn',
      );
    const saved = await this.solicitudesRepository.manager.transaction(
      async (txManager) => {
        const solicitudRepo = txManager.getRepository(Solicitud);
        const outboxRepo = txManager.getRepository(OutboxEventoIntegracion);

        const solicitud = solicitudRepo.create({
          ...dto,
          dominio: dto.dominio ?? (dto.tipoSolicitud === 'telecom' ? 'telecom' : 'equipos'),
          empresaId: user.empresaId,
          usuarioId: user.userId,
          personaId,
          origen: dto.origen ?? 'portal',
          canalEntrada: dto.canalEntrada,
          desdeEn,
          hastaEn,
          estado: 'pendiente',
        });
        const savedSolicitud = await solicitudRepo.save(solicitud);

        await outboxRepo.save(
          outboxRepo.create({
            empresaId: savedSolicitud.empresaId,
            aggregateType: 'solicitud_portal',
            aggregateId: savedSolicitud.id,
            eventType: 'solicitud_creada',
            idempotencyKey: `solicitud_creada:${savedSolicitud.id}`,
            payloadJson: {
              solicitudId: savedSolicitud.id,
              empresaId: savedSolicitud.empresaId,
              tipoSolicitud: savedSolicitud.tipoSolicitud,
              recursoTipo: savedSolicitud.recursoTipo,
              origen: savedSolicitud.origen,
              canalEntrada: savedSolicitud.canalEntrada,
              referenciaExterna: savedSolicitud.referenciaExterna,
              createdAt: savedSolicitud.createdAt,
            },
            estado: 'pendiente',
            intentos: 0,
            maxIntentos: 10,
          }),
        );

        return savedSolicitud;
      },
    );
    return saved;
  }

  async createMixta(dto: CreateSolicitudMixtaDto, user: AuthenticatedUser) {
    const grupoId = randomUUID();
    const usuario = await this.usuariosRepository.findOne({ where: { id: user.userId, empresaId: user.empresaId, estado: 'activo', deletedAt: IsNull() } });
    const personaId = dto.personaId ?? usuario?.personaId;
    if (!usuario || !personaId) throw new BadRequestException('Usuario o persona no disponible para solicitud mixta');
    const persona = await this.personasRepository.findOne({ where: { id: personaId, empresaId: user.empresaId, estado: 'activo', deletedAt: IsNull() } });
    if (!persona) throw new BadRequestException('La persona no pertenece al tenant o está inactiva');
    const tipos = [dto.equipoRecursoTipo, dto.telecomRecursoTipo];
    await Promise.all(tipos.map((recursoTipo) => this.configuracionService.assertAllowed(user.empresaId, recursoTipo)));
    const desdeEn = dto.desdeEn ? new Date(dto.desdeEn) : undefined;
    const hastaEn = dto.hastaEn ? new Date(dto.hastaEn) : undefined;
    if (desdeEn && hastaEn && hastaEn < desdeEn) throw new BadRequestException('La fecha hastaEn no puede ser anterior a desdeEn');
    return this.solicitudesRepository.manager.transaction(async (txManager) => {
      const repo = txManager.getRepository(Solicitud);
      const outbox = txManager.getRepository(OutboxEventoIntegracion);
      const parentId = randomUUID();
      const base = { empresaId: user.empresaId, usuarioId: user.userId, personaId, grupoId, solicitudPadreId: parentId, origen: 'portal', desdeEn, hastaEn, motivo: dto.motivo, estado: 'pendiente' };
      const equipo = await repo.save(repo.create({ ...base, id: parentId, dominio: 'equipos', tipoSolicitud: 'activo', recursoTipo: dto.equipoRecursoTipo, recursoId: dto.equipoRecursoId }));
      const telecom = await repo.save(repo.create({ ...base, id: undefined, solicitudPadreId: equipo.id, dominio: 'telecom', tipoSolicitud: 'telecom', recursoTipo: dto.telecomRecursoTipo, recursoId: dto.telecomRecursoId }));
      await outbox.save(outbox.create([equipo, telecom].map((item) => ({ empresaId: user.empresaId, aggregateType: 'solicitud_portal', aggregateId: item.id, eventType: 'solicitud_creada', idempotencyKey: `solicitud_creada:${item.id}`, payloadJson: { solicitudId: item.id, grupoId, dominio: item.dominio }, estado: 'pendiente', intentos: 0, maxIntentos: 10 }))));
      return { grupoId, solicitudPadreId: equipo.id, solicitudes: [equipo, telecom] };
    });
  }

  private validarCombinacionSolicitud(dto: CreateSolicitudDto): void {
    const tiposActivo = new Set([
      'laptop',
      'monitor',
      'proyector',
      'prestamo_actividad',
      'prestamo_permanente',
      'reparacion_activo',
    ]);
    const tiposTelecom = new Set([
      'paquete_datos',
      'recarga_minutos',
      'sms',
      'telecom',
    ]);

    if (dto.tipoSolicitud === 'activo' && !tiposActivo.has(dto.recursoTipo)) {
      throw new BadRequestException(
        `El tipoSolicitud activo no permite recursoTipo ${dto.recursoTipo}`,
      );
    }
    if (dto.tipoSolicitud === 'telecom' && !tiposTelecom.has(dto.recursoTipo)) {
      throw new BadRequestException(
        `El tipoSolicitud telecom no permite recursoTipo ${dto.recursoTipo}`,
      );
    }

    if (dto.recursoTipo === 'recarga_minutos' && !dto.recursoId) {
      throw new BadRequestException(
        'Las solicitudes de recarga_minutos requieren recursoId de la linea',
      );
    }
    if (dto.recursoTipo === 'reparacion_activo' && !dto.recursoId) {
      throw new BadRequestException(
        'Las solicitudes de reparacion_activo requieren recursoId del activo',
      );
    }
    if (dto.recursoTipo === 'prestamo_actividad') {
      if (!dto.desdeEn || !dto.hastaEn) {
        throw new BadRequestException(
          'Las solicitudes de prestamo_actividad requieren desdeEn y hastaEn',
        );
      }
    }
  }

  private async validarPermisoDominio(tipoSolicitud: string, user: AuthenticatedUser): Promise<void> {
    const required = tipoSolicitud === 'telecom' ? 'telecom.gestionar' : 'asignaciones.gestionar';
    const assignments = await this.usuarioRolesRepository.find({ where: { empresaId: user.empresaId, usuarioId: user.userId } });
    const grants = assignments.length ? await this.rolPermisosRepository.find({ where: { empresaId: user.empresaId, rolId: In(assignments.map(item => item.rolId)) } }) : [];
    const allowed = grants.length ? await this.permisosRepository.findOne({ where: { id: In(grants.map(item => item.permisoId)) as never, codigo: required } }) : null;
    if (!allowed) throw new BadRequestException(`El operador no puede procesar solicitudes del dominio ${tipoSolicitud}`);
  }

  findMine(user: AuthenticatedUser): Promise<Solicitud[]> {
    return this.solicitudesRepository.find({
      where: { empresaId: user.empresaId, usuarioId: user.userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findAdmin(
    user: AuthenticatedUser,
    query: QuerySolicitudesDto,
  ): Promise<{
    items: Solicitud[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.solicitudesRepository
      .createQueryBuilder('solicitud')
      .where('solicitud.empresa_id = :empresaId', { empresaId: user.empresaId });

    if (query.estado) {
      qb.andWhere('solicitud.estado = :estado', { estado: query.estado });
    }
    if (query.tipoSolicitud) {
      qb.andWhere('solicitud.tipo_solicitud = :tipoSolicitud', {
        tipoSolicitud: query.tipoSolicitud,
      });
    }
    if (query.dominio) {
      qb.andWhere('solicitud.dominio = :dominio', { dominio: query.dominio });
    }
    if (query.recursoTipo) {
      qb.andWhere('solicitud.recurso_tipo = :recursoTipo', {
        recursoTipo: query.recursoTipo,
      });
    }
    if (query.search?.trim()) {
      qb.andWhere(
        '(solicitud.referencia_externa ILIKE :term OR solicitud.motivo ILIKE :term)',
        { term: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('solicitud.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async aprobar(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateEstadoSolicitudDto,
  ): Promise<Solicitud> {
    const solicitud = await this.findForAdminAction(id, user.empresaId);
    await this.validarPermisoDominio(solicitud.tipoSolicitud ?? 'activo', user);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden aprobar solicitudes en estado pendiente',
      );
    }
    solicitud.estado = 'aprobada';
    solicitud.motivo = this.mergeMotivoRevision(solicitud.motivo, dto.motivoRevision);
    return this.solicitudesRepository.save(solicitud);
  }

  async rechazar(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateEstadoSolicitudDto,
  ): Promise<Solicitud> {
    const solicitud = await this.findForAdminAction(id, user.empresaId);
    await this.validarPermisoDominio(solicitud.tipoSolicitud ?? 'activo', user);
    if (solicitud.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden rechazar solicitudes en estado pendiente',
      );
    }
    solicitud.estado = 'rechazada';
    solicitud.motivo = this.mergeMotivoRevision(solicitud.motivo, dto.motivoRevision);
    return this.solicitudesRepository.save(solicitud);
  }

  async convertirAAsignacion(
    id: string,
    user: AuthenticatedUser,
    dto: ConvertirASolicitudAsignacionDto,
  ) {
    const solicitud = await this.findForAdminAction(id, user.empresaId);
    await this.validarPermisoDominio(solicitud.tipoSolicitud ?? 'activo', user);
    if (solicitud.estado !== 'aprobada') {
      throw new BadRequestException(
        'Solo se pueden convertir solicitudes aprobadas',
      );
    }

    const existente = await this.solicitudesRepository.manager
      .getRepository(Asignacion)
      .createQueryBuilder('asignacion')
      .where('asignacion.empresa_id = :empresaId', { empresaId: user.empresaId })
      .andWhere('asignacion.solicitud_origen_id = :solicitudId', { solicitudId: solicitud.id })
      .getOne();
    if (existente) {
      throw new BadRequestException(
        'La solicitud ya fue convertida a una asignacion',
      );
    }

    const asignacion = await this.asignacionesService.create(
      {
        personaId: dto.personaId ?? solicitud.personaId,
        departamentoId: dto.departamentoId,
        ubicacionId: dto.ubicacionId,
        fechaAsignacion: dto.fechaAsignacion ?? new Date().toISOString(),
        fechaPrevistaDevolucion: dto.fechaPrevistaDevolucion,
        motivo: dto.motivo ?? solicitud.motivo,
        observaciones: dto.observaciones,
        estado: 'borrador',
      },
      user,
    );

    await this.solicitudesRepository.manager
      .createQueryBuilder()
      .update(Asignacion)
      .set({ solicitudOrigenId: solicitud.id })
      .where('id = :asignacionId', { asignacionId: asignacion.id })
      .andWhere('empresa_id = :empresaId', { empresaId: user.empresaId })
      .execute();

    solicitud.estado = 'en_proceso';
    await this.solicitudesRepository.save(solicitud);

    return {
      solicitudId: solicitud.id,
      asignacionId: asignacion.id,
      estadoSolicitud: solicitud.estado,
    };
  }

  async convertirAPrestamo(
    id: string,
    user: AuthenticatedUser,
    dto: ConvertirASolicitudPrestamoDto,
  ) {
    const solicitud = await this.findForAdminAction(id, user.empresaId);
    if (solicitud.estado !== 'aprobada') {
      throw new BadRequestException(
        'Solo se pueden convertir solicitudes aprobadas',
      );
    }

    const existente = await this.solicitudesRepository.manager
      .getRepository(PrestamoActivo)
      .createQueryBuilder('prestamo')
      .where('prestamo.empresa_id = :empresaId', { empresaId: user.empresaId })
      .andWhere('prestamo.solicitud_origen_id = :solicitudId', {
        solicitudId: solicitud.id,
      })
      .getOne();
    if (existente) {
      throw new BadRequestException(
        'La solicitud ya fue convertida a un prestamo',
      );
    }

    const activoId = dto.activoId ?? solicitud.recursoId;
    if (!activoId) {
      throw new BadRequestException(
        'Debe indicar activoId para convertir la solicitud a prestamo',
      );
    }

    const prestamo = await this.prestamosActivoService.create(
      {
        activoId,
        personaId: dto.personaId ?? solicitud.personaId,
        departamentoId: dto.departamentoId,
        fechaSalida: dto.fechaSalida ?? new Date().toISOString(),
        fechaPrevistaRetorno: dto.fechaPrevistaRetorno,
        observaciones: dto.observaciones ?? solicitud.motivo,
        estado: 'prestado',
      },
      user,
    );

    await this.solicitudesRepository.manager
      .createQueryBuilder()
      .update(PrestamoActivo)
      .set({ solicitudOrigenId: solicitud.id })
      .where('id = :prestamoId', { prestamoId: prestamo.id })
      .andWhere('empresa_id = :empresaId', { empresaId: user.empresaId })
      .execute();

    solicitud.estado = 'en_proceso';
    await this.solicitudesRepository.save(solicitud);

    return {
      solicitudId: solicitud.id,
      prestamoId: prestamo.id,
      estadoSolicitud: solicitud.estado,
    };
  }

  async convertirAReparacion(
    id: string,
    user: AuthenticatedUser,
    dto: ConvertirASolicitudReparacionDto,
  ) {
    const solicitud = await this.findForAdminAction(id, user.empresaId);
    if (solicitud.estado !== 'aprobada') {
      throw new BadRequestException(
        'Solo se pueden convertir solicitudes aprobadas',
      );
    }

    const existente = await this.solicitudesRepository.manager
      .getRepository(ReparacionActivo)
      .createQueryBuilder('reparacion')
      .where('reparacion.empresa_id = :empresaId', { empresaId: user.empresaId })
      .andWhere('reparacion.solicitud_origen_id = :solicitudId', {
        solicitudId: solicitud.id,
      })
      .getOne();
    if (existente) {
      throw new BadRequestException(
        'La solicitud ya fue convertida a una reparacion',
      );
    }

    const activoId = dto.activoId ?? solicitud.recursoId;
    if (!activoId) {
      throw new BadRequestException(
        'Debe indicar activoId para convertir la solicitud a reparacion',
      );
    }

    const diagnostico = dto.diagnostico ?? solicitud.motivo;
    if (!diagnostico) {
      throw new BadRequestException(
        'Debe indicar diagnostico para convertir la solicitud a reparacion',
      );
    }

    const reparacion = await this.reparacionesActivoService.create(
      {
        activoId,
        tipoServicio: dto.tipoServicio ?? 'reparacion',
        diagnostico,
        fechaIngreso: dto.fechaIngreso ?? new Date().toISOString(),
        observaciones: dto.observaciones ?? solicitud.motivo,
        estado: 'abierta',
      },
      user,
    );

    await this.solicitudesRepository.manager
      .createQueryBuilder()
      .update(ReparacionActivo)
      .set({ solicitudOrigenId: solicitud.id })
      .where('id = :reparacionId', { reparacionId: reparacion.id })
      .andWhere('empresa_id = :empresaId', { empresaId: user.empresaId })
      .execute();

    solicitud.estado = 'en_proceso';
    await this.solicitudesRepository.save(solicitud);

    return {
      solicitudId: solicitud.id,
      reparacionId: reparacion.id,
      estadoSolicitud: solicitud.estado,
    };
  }

  private async findForAdminAction(
    id: string,
    empresaId: string,
  ): Promise<Solicitud> {
    const solicitud = await this.solicitudesRepository.findOne({
      where: { id, empresaId },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
  }

  private mergeMotivoRevision(
    actual: string | undefined,
    revision: string | undefined,
  ): string | undefined {
    if (!revision?.trim()) return actual;
    const note = `[revision] ${revision.trim()}`;
    if (!actual?.trim()) return note;
    return `${actual}\n${note}`;
  }
}
