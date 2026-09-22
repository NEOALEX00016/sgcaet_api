import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import {
  REQUIRED_ANY_PERMISSION_KEY,
  REQUIRED_BODY_FIELD_PERMISSIONS_KEY,
  REQUIRED_PERMISSION_KEY,
} from './decorators/require-permission.decorator';
import { PermissionsEvaluatorService } from './permissions-evaluator.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(UsuarioRol) usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso) rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso) permisosRepository: Repository<Permiso>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {
    this.evaluator = new PermissionsEvaluatorService(
      usuarioRolesRepository,
      rolPermisosRepository,
      permisosRepository,
    );
  }

  private readonly evaluator: PermissionsEvaluatorService;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredMetadata = this.reflector.getAllAndOverride<
      string | string[]
    >(REQUIRED_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
    const anyMetadata = this.reflector.getAllAndOverride<string[]>(
      REQUIRED_ANY_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const bodyMetadata = this.reflector.getAllAndOverride<
      Record<string, string[]>
    >(REQUIRED_BODY_FIELD_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const anyRequired = Array.isArray(anyMetadata) ? anyMetadata : [];
    const bodyPolicies =
      bodyMetadata &&
      !Array.isArray(bodyMetadata) &&
      typeof bodyMetadata === 'object'
        ? bodyMetadata
        : undefined;
    if (!requiredMetadata && !anyRequired.length && !bodyPolicies) return true;
    const required = requiredMetadata
      ? Array.isArray(requiredMetadata)
        ? requiredMetadata
        : [requiredMetadata]
      : [];
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser; body?: Record<string, unknown> }>();
    const user = request.user;
    if (!user) throw new ForbiddenException('Usuario autenticado requerido');

    const actor = await this.usuariosRepository.findOne({
      where: { id: user.userId, empresaId: user.empresaId },
    });
    if (
      actor?.esPropietarioPlataforma &&
      required.length > 0 &&
      required.every((permission) => permission.startsWith('plataforma.'))
    )
      return true;

    const missing: string[] = [];
    for (const permission of required) {
      if (!(await this.evaluator.hasAny(user, [permission])))
        missing.push(permission);
    }
    if (missing.length)
      throw new ForbiddenException(`Permiso requerido: ${missing.join(', ')}`);
    if (anyRequired.length) await this.evaluator.requireAny(user, anyRequired);
    for (const [field, permissions] of Object.entries(bodyPolicies ?? {})) {
      if (Object.prototype.hasOwnProperty.call(request.body ?? {}, field)) {
        await this.evaluator.requireAny(user, permissions);
      }
    }
    return true;
  }
}
