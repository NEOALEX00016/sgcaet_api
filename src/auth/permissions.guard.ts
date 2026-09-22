import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { REQUIRED_PERMISSION_KEY } from './decorators/require-permission.decorator';

const PERMISSION_ALIASES: Record<string, string[]> = {
  'solicitudes.ver': ['solicitudes.gestionar'],
  'solicitudes.configurar': ['solicitudes.gestionar'],
  'fuentes-empleados.ver': ['personas.gestionar'],
  'fuentes-empleados.crear': ['personas.gestionar'],
  'fuentes-empleados.editar': ['personas.gestionar'],
  'fuentes-empleados.probar': ['personas.gestionar'],
  'fuentes-empleados.eliminar': ['personas.gestionar'],
  'personas.ejecuciones-carga.ver': ['personas.gestionar'],
  'estructura.nodos.ver': ['personas.gestionar'],
  'estructura.nodos.crear': ['personas.gestionar'],
  'estructura.nodos.editar': ['personas.gestionar'],
  'estructura.nodos.eliminar': ['personas.gestionar'],
  'inventario.asignaciones.gestionar': ['telecom.gestionar'],
  'telecom.pools.gestionar': ['telecom.gestionar'],
  'telecom.planes.gestionar': ['telecom.gestionar'],
  'telecom.recargas.gestionar': ['telecom.gestionar'],
  'telecom.asignaciones.gestionar': ['telecom.gestionar'],
  'reglas-negocio.gestionar': ['telecom.gestionar'],
};

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string>(
      REQUIRED_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Usuario autenticado requerido');

    const actor = await this.usuariosRepository.findOne({
      where: { id: user.userId, empresaId: user.empresaId },
    });
    if (actor?.esPropietarioPlataforma && required.startsWith('plataforma.'))
      return true;

    const roleAssignments = await this.usuarioRolesRepository.find({
      where: { empresaId: user.empresaId, usuarioId: user.userId },
    });
    if (!roleAssignments.length)
      throw new ForbiddenException('Permiso insuficiente');
    const roleIds = roleAssignments.map((assignment) => assignment.rolId);
    const grants = await this.rolPermisosRepository.find({
      where: { empresaId: user.empresaId, rolId: In(roleIds) },
    });
    if (!grants.length) throw new ForbiddenException('Permiso insuficiente');
    const acceptedCodes = [required, ...(PERMISSION_ALIASES[required] ?? [])];
    const permission = await this.permisosRepository.findOne({
      where: {
        id: In(grants.map((grant) => grant.permisoId)) as never,
        codigo:
          acceptedCodes.length > 1
            ? (In(acceptedCodes) as never)
            : required,
      },
    });
    if (!permission)
      throw new ForbiddenException(`Permiso requerido: ${required}`);
    return true;
  }
}
