import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAsignacionRecursoDto } from './dto/create-asignacion-recurso.dto';
import { UpdateAsignacionRecursoDto } from './dto/update-asignacion-recurso.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { AsignacionRecurso } from './entities/asignacion-recurso.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AsignacionRecursosService {
  constructor(
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(SuscripcionesLinea)
    private readonly suscripcionesRepository: Repository<SuscripcionesLinea>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(ReparacionActivo)
    private readonly reparacionesRepository: Repository<ReparacionActivo>,
  ) {}

  async create(
    createAsignacionRecursoDto: CreateAsignacionRecursoDto,
    user: AuthenticatedUser,
  ): Promise<AsignacionRecurso> {
    await this.validarActor(user);
    await this.validarDominioRecurso(createAsignacionRecursoDto.tipoRecurso, user);
    await this.validarAsignacion(
      createAsignacionRecursoDto.asignacionId,
      user.empresaId,
    );
    this.validarIntegridadTipo(
      createAsignacionRecursoDto.tipoRecurso,
      createAsignacionRecursoDto.activoId,
      createAsignacionRecursoDto.lineaTelefonicaId,
    );
    await this.validarUnicidadRecursoActivo(
      createAsignacionRecursoDto.tipoRecurso,
      createAsignacionRecursoDto.activoId,
      createAsignacionRecursoDto.lineaTelefonicaId,
      null,
      user.empresaId,
    );

    if (
      createAsignacionRecursoDto.tipoRecurso === 'activo' &&
      createAsignacionRecursoDto.activoId
    ) {
      await this.validarActivo(
        createAsignacionRecursoDto.activoId,
        user.empresaId,
      );
      await this.validarActivoDisponible(
        createAsignacionRecursoDto.activoId,
        user.empresaId,
      );
    }

    if (
      createAsignacionRecursoDto.tipoRecurso === 'linea' &&
      createAsignacionRecursoDto.lineaTelefonicaId
    ) {
      await this.validarLineaDisponible(
        createAsignacionRecursoDto.lineaTelefonicaId,
        user.empresaId,
      );
    }

    const recurso = this.asignacionRecursosRepository.create({
      ...createAsignacionRecursoDto,
      empresaId: user.empresaId,
      estaActivo: createAsignacionRecursoDto.estaActivo ?? true,
    });

    const saved = await this.asignacionRecursosRepository.save(recurso);
    if (saved.tipoRecurso === 'activo' && saved.activoId && saved.estaActivo) {
      await this.actualizarEstadoActivo(saved.activoId, user.empresaId, 'asignado');
    }

    await this.registrarBitacora(
      user,
      'ASIGNACION_RECURSOS_CREAR',
      'asignacion_recursos',
      saved.id,
      null,
      {
        asignacionId: saved.asignacionId,
        tipoRecurso: saved.tipoRecurso,
        activoId: saved.activoId ?? null,
        lineaTelefonicaId: saved.lineaTelefonicaId ?? null,
      },
    );

    return saved;
  }

  private async validarActivoDisponible(activoId: string | undefined, empresaId: string): Promise<void> {
    if (!activoId) return;
    const reparacion = await this.reparacionesRepository.findOne({
      where: [
        { activoId, empresaId, estado: 'abierta' },
        { activoId, empresaId, estado: 'en_proceso' },
        { activoId, empresaId, estado: 'esperando_repuestos' },
      ],
    });
    if (reparacion) {
      throw new BadRequestException('El equipo está en mantenimiento y no está disponible para asignación.');
    }
  }

  async findAll(user: AuthenticatedUser): Promise<AsignacionRecurso[]> {
    const items = await this.asignacionRecursosRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
    const [canEquipos, canTelecom] = await Promise.all([
      this.tienePermiso(user, 'inventario.asignaciones.gestionar'),
      this.tienePermiso(user, 'telecom.gestionar'),
    ]);
    return items.filter((item) =>
      (item.tipoRecurso === 'activo' && canEquipos) ||
      (item.tipoRecurso === 'linea' && canTelecom),
    );
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AsignacionRecurso> {
    const recurso = await this.asignacionRecursosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!recurso) {
      throw new NotFoundException(`Asignacion recurso ${id} no encontrada`);
    }
    return recurso;
  }

  async update(
    id: string,
    updateAsignacionRecursoDto: UpdateAsignacionRecursoDto,
    user: AuthenticatedUser,
  ): Promise<AsignacionRecurso> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    await this.validarDominioRecurso(actual.tipoRecurso, user);

    const merged = this.asignacionRecursosRepository.merge(
      actual,
      updateAsignacionRecursoDto,
    );
    const saved = await this.asignacionRecursosRepository.save(merged);
    if (saved.tipoRecurso === 'activo' && saved.activoId && actual.estaActivo !== saved.estaActivo) {
      await this.actualizarEstadoActivo(saved.activoId, user.empresaId, saved.estaActivo ? 'asignado' : 'registrado');
    }

    await this.registrarBitacora(
      user,
      'ASIGNACION_RECURSOS_ACTUALIZAR',
      'asignacion_recursos',
      saved.id,
      {
        estaActivo: actual.estaActivo,
      },
      {
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    await this.validarDominioRecurso(actual.tipoRecurso, user);

    actual.estaActivo = false;
    await this.asignacionRecursosRepository.save(actual);
    if (actual.tipoRecurso === 'activo' && actual.activoId) {
      await this.actualizarEstadoActivo(actual.activoId, user.empresaId, 'registrado');
    }

    await this.registrarBitacora(
      user,
      'ASIGNACION_RECURSOS_DESACTIVAR',
      'asignacion_recursos',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: false,
      },
    );
  }

  private async actualizarEstadoActivo(
    activoId: string,
    empresaId: string,
    estado: 'asignado' | 'registrado',
  ): Promise<void> {
    const activo = await this.activosRepository.findOne({
      where: { id: activoId, empresaId, deletedAt: IsNull() },
    });
    if (!activo) return;
    if (['en_reparacion', 'perdido', 'robado', 'dado_de_baja', 'desechado'].includes(activo.estado)) return;
    activo.estado = estado;
    await this.activosRepository.save(activo);
  }

  private validarIntegridadTipo(
    tipoRecurso: string,
    activoId?: string,
    lineaTelefonicaId?: string,
  ): void {
    if (tipoRecurso === 'activo' && (!activoId || lineaTelefonicaId)) {
      throw new BadRequestException(
        'Para tipo activo se requiere activoId y no lineaTelefonicaId',
      );
    }

    if (tipoRecurso === 'linea' && (!lineaTelefonicaId || activoId)) {
      throw new BadRequestException(
        'Para tipo linea se requiere lineaTelefonicaId y no activoId',
      );
    }
  }

  private async validarUnicidadRecursoActivo(
    tipoRecurso: string,
    activoId?: string,
    lineaTelefonicaId?: string,
    excludeId?: string | null,
    empresaId?: string,
  ): Promise<void> {
    if (tipoRecurso === 'activo' && activoId) {
      const existente = await this.asignacionRecursosRepository.findOne({
        where: {
          activoId,
          ...(empresaId ? { empresaId } : {}),
          estaActivo: true,
        },
      });

      if (existente && existente.id !== excludeId) {
        const asignacionAnterior = await this.asignacionesRepository.findOne({
          where: {
            id: existente.asignacionId,
            ...(empresaId ? { empresaId } : {}),
          },
        });
        if (asignacionAnterior && ['cancelada', 'finalizada', 'rechazada'].includes(asignacionAnterior.estado)) {
          existente.estaActivo = false;
          await this.asignacionRecursosRepository.save(existente);
        } else {
          throw new BadRequestException(
            'El activo ya tiene una asignacion activa',
          );
        }
      }
    }

    if (tipoRecurso === 'linea' && lineaTelefonicaId) {
      const existente = await this.asignacionRecursosRepository.findOne({
        where: {
          lineaTelefonicaId,
          ...(empresaId ? { empresaId } : {}),
          estaActivo: true,
        },
      });

      if (existente && existente.id !== excludeId) {
        throw new BadRequestException(
          'La linea telefonica ya tiene una asignacion activa',
        );
      }
    }
  }

  private async validarAsignacion(
    asignacionId: string,
    empresaId: string,
  ): Promise<void> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: {
        id: asignacionId,
        empresaId,
      },
    });

    if (!asignacion) {
      throw new NotFoundException(
        'Asignacion no encontrada para la empresa indicada',
      );
    }
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

  private async validarLineaDisponible(
    lineaTelefonicaId: string,
    empresaId: string,
  ): Promise<void> {
    const linea = await this.lineasRepository.findOne({
      where: {
        id: lineaTelefonicaId,
        empresaId,
      },
    });

    if (!linea || !linea.estaActiva || linea.estado === 'cancelada') {
      throw new NotFoundException(
        'Linea telefonica activa no encontrada para la empresa indicada',
      );
    }

    const suscripcion = await this.suscripcionesRepository.findOne({
      where: {
        lineaTelefonicaId,
        empresaId,
        estado: 'activa',
      },
      order: {
        iniciaEn: 'DESC',
      },
    });

    if (!suscripcion) {
      throw new BadRequestException(
        'La linea telefonica no tiene una suscripcion activa disponible',
      );
    }

    const ahora = Date.now();
    if (
      suscripcion.iniciaEn.getTime() > ahora ||
      (suscripcion.venceEn && suscripcion.venceEn.getTime() < ahora)
    ) {
      throw new BadRequestException(
        'La linea telefonica no tiene una suscripcion vigente',
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

  private async validarDominioRecurso(
    tipoRecurso: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const permiso = tipoRecurso === 'linea'
      ? 'telecom.gestionar'
      : 'inventario.asignaciones.gestionar';
    if (!(await this.tienePermiso(user, permiso))) {
      throw new BadRequestException(
        `El usuario no puede operar recursos del dominio ${tipoRecurso === 'linea' ? 'telecom' : 'equipos'}`,
      );
    }
  }

  private async tienePermiso(
    user: AuthenticatedUser,
    codigo: string,
  ): Promise<boolean> {
    const assignments = await this.usuarioRolesRepository.find({
      where: { empresaId: user.empresaId, usuarioId: user.userId },
    });
    if (!assignments.length) return false;
    const grants = await this.rolPermisosRepository.find({
      where: {
        empresaId: user.empresaId,
        rolId: In(assignments.map((item) => item.rolId)),
      },
    });
    if (!grants.length) return false;
    return Boolean(await this.permisosRepository.findOne({
      where: {
        id: In(grants.map((item) => item.permisoId)) as never,
        codigo,
      },
    }));
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
