import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRolPermisoDto } from './dto/create-rol-permiso.dto';
import { UpdateRolPermisoDto } from './dto/update-rol-permiso.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RolPermiso } from './entities/rol-permiso.entity';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RolPermisosService {
  constructor(
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
  ) {}

  async create(
    createRolPermisoDto: CreateRolPermisoDto,
    user: AuthenticatedUser,
  ): Promise<RolPermiso> {
    await this.validarAsignacion(
      user,
      createRolPermisoDto.rolId,
      createRolPermisoDto.permisoId,
    );

    const existente = await this.rolPermisosRepository.findOne({
      where: {
        empresaId: user.empresaId,
        rolId: createRolPermisoDto.rolId,
        permisoId: createRolPermisoDto.permisoId,
      },
    });

    if (existente) {
      return existente;
    }

    const rolPermiso = this.rolPermisosRepository.create({
      ...createRolPermisoDto,
      empresaId: user.empresaId,
      otorgadoPor: user.userId,
      otorgadoEn: createRolPermisoDto.otorgadoEn
        ? new Date(createRolPermisoDto.otorgadoEn)
        : new Date(),
    });

    const saved = await this.rolPermisosRepository.save(rolPermiso);

    await this.registrarBitacora(
      user,
      'SEGURIDAD_ASIGNAR_PERMISO_ROL',
      'rol_permisos',
      saved.id,
      null,
      {
        rolId: saved.rolId,
        permisoId: saved.permisoId,
        otorgadoPor: saved.otorgadoPor,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<RolPermiso[]> {
    return this.rolPermisosRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<RolPermiso> {
    const rolPermiso = await this.rolPermisosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!rolPermiso) {
      throw new NotFoundException(`RolPermiso ${id} no encontrado`);
    }
    return rolPermiso;
  }

  async update(
    id: string,
    _updateRolPermisoDto: UpdateRolPermisoDto,
    user: AuthenticatedUser,
  ): Promise<RolPermiso> {
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.rolPermisosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!actual) {
      return;
    }

    await this.rolPermisosRepository.delete({ id, empresaId: user.empresaId });
    await this.registrarBitacora(
      user,
      'SEGURIDAD_REVOCAR_PERMISO_ROL',
      'rol_permisos',
      actual.id,
      {
        rolId: actual.rolId,
        permisoId: actual.permisoId,
      },
      null,
    );
  }

  private async validarAsignacion(
    user: AuthenticatedUser,
    rolId: string,
    permisoId: string,
  ): Promise<void> {
    const empresaId = user.empresaId;
    const rol = await this.rolesRepository.findOne({
      where: { id: rolId, empresaId },
    });
    if (!rol) {
      throw new NotFoundException('Rol no encontrado para la empresa indicada');
    }

    const permiso = await this.permisosRepository.findOne({
      where: { id: permisoId },
    });
    if (!permiso) {
      throw new NotFoundException('Permiso no encontrado');
    }

    const actor = await this.usuariosRepository.findOne({
      where: { id: user.userId, empresaId },
    });
    if (!actor) {
      throw new NotFoundException(
        'Usuario actor no encontrado para la empresa indicada',
      );
    }

    await this.validarActorAutorizado(
      actor.id,
      empresaId,
      actor.esPropietarioPlataforma,
    );
  }

  private async validarActorAutorizado(
    actorId: string,
    empresaId: string,
    esPropietarioPlataforma: boolean,
  ): Promise<void> {
    if (esPropietarioPlataforma) {
      return;
    }

    const asignaciones = await this.usuarioRolesRepository.find({
      where: { empresaId, usuarioId: actorId },
    });

    if (asignaciones.length === 0) {
      throw new ForbiddenException(
        'El usuario actor no tiene permisos para gestionar seguridad',
      );
    }

    const roleIds = asignaciones.map((item) => item.rolId);
    const grants = await this.rolPermisosRepository.find({
      where: { empresaId, rolId: In(roleIds) },
    });
    const permission = await this.permisosRepository.findOne({
      where: {
        id: In(grants.map((grant) => grant.permisoId)) as never,
        codigo: 'seguridad.permisos.gestionar',
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        'El usuario actor no tiene permisos para asignar o revocar permisos',
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
