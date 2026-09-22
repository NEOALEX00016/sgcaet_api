import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUsuarioRoleDto } from './dto/create-usuario-role.dto';
import { UpdateUsuarioRoleDto } from './dto/update-usuario-role.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { UsuarioRol } from './entities/usuario-role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/role.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

@Injectable()
export class UsuarioRolesService {
  constructor(
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
  ) {}

  async create(
    createUsuarioRoleDto: CreateUsuarioRoleDto,
    user: AuthenticatedUser,
  ): Promise<UsuarioRol> {
    await this.validarAsignacion(
      user,
      createUsuarioRoleDto.usuarioId,
      createUsuarioRoleDto.rolId,
    );

    const existente = await this.usuarioRolesRepository.findOne({
      where: {
        empresaId: user.empresaId,
        usuarioId: createUsuarioRoleDto.usuarioId,
        rolId: createUsuarioRoleDto.rolId,
      },
    });

    if (existente) {
      return existente;
    }

    const usuarioRol = this.usuarioRolesRepository.create({
      ...createUsuarioRoleDto,
      empresaId: user.empresaId,
      asignadoPor: user.userId,
      asignadoEn: createUsuarioRoleDto.asignadoEn
        ? new Date(createUsuarioRoleDto.asignadoEn)
        : new Date(),
    });

    const saved = await this.usuarioRolesRepository.save(usuarioRol);

    await this.registrarBitacora(
      user,
      'SEGURIDAD_ASIGNAR_ROL_USUARIO',
      'usuario_roles',
      saved.id,
      null,
      {
        usuarioId: saved.usuarioId,
        rolId: saved.rolId,
        asignadoPor: saved.asignadoPor,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<UsuarioRol[]> {
    return this.usuarioRolesRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<UsuarioRol> {
    const usuarioRol = await this.usuarioRolesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!usuarioRol) {
      throw new NotFoundException(`UsuarioRol ${id} no encontrado`);
    }
    return usuarioRol;
  }

  async update(
    id: string,
    _updateUsuarioRoleDto: UpdateUsuarioRoleDto,
    user: AuthenticatedUser,
  ): Promise<UsuarioRol> {
    return this.findOne(id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.usuarioRolesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!actual) {
      return;
    }

    await this.usuarioRolesRepository.delete({ id, empresaId: user.empresaId });
    await this.registrarBitacora(
      user,
      'SEGURIDAD_REVOCAR_ROL_USUARIO',
      'usuario_roles',
      actual.id,
      {
        usuarioId: actual.usuarioId,
        rolId: actual.rolId,
      },
      null,
    );
  }

  private async validarAsignacion(
    user: AuthenticatedUser,
    usuarioId: string,
    rolId: string,
  ): Promise<void> {
    const empresaId = user.empresaId;
    const usuario = await this.usuariosRepository.findOne({
      where: { id: usuarioId, empresaId, deletedAt: IsNull() },
    });
    if (!usuario) {
      throw new NotFoundException(
        'Usuario objetivo no encontrado para la empresa indicada',
      );
    }

    const rol = await this.rolesRepository.findOne({
      where: { id: rolId, empresaId },
    });
    if (!rol) {
      throw new NotFoundException('Rol no encontrado para la empresa indicada');
    }

    const actor = await this.usuariosRepository.findOne({
      where: { id: user.userId, empresaId, deletedAt: IsNull() },
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

    const asignacionesActor = await this.usuarioRolesRepository.find({
      where: { empresaId, usuarioId: actorId },
    });

    if (asignacionesActor.length === 0) {
      throw new ForbiddenException(
        'El usuario actor no tiene permisos para gestionar roles',
      );
    }

    const roleIds = asignacionesActor.map((item) => item.rolId);
    const grants = await this.rolPermisosRepository.find({
      where: { empresaId, rolId: In(roleIds) },
    });
    const permission = await this.permisosRepository.findOne({
      where: {
        id: In(grants.map((grant) => grant.permisoId)) as never,
        codigo: 'seguridad.roles.gestionar',
      },
    });

    if (!permission) {
      throw new ForbiddenException(
        'El usuario actor no tiene permisos para asignar o revocar roles',
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
