import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type { AuthenticatedUser } from './decorators/current-user.decorator';
import { Permiso } from '../permisos/entities/permiso.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

export const PERMISSION_ALIASES: Record<string, string[]> = {
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
  'repuestos.ver': ['reparaciones.gestionar'],
  'repuestos.catalogo.gestionar': ['reparaciones.gestionar'],
  'repuestos.existencias.gestionar': ['reparaciones.gestionar'],
  'repuestos.movimientos.ver': ['reparaciones.gestionar'],
  'componentes_instalados.ver': ['reparaciones.gestionar'],
  'componentes_instalados.gestionar': ['reparaciones.gestionar'],
  'reparaciones.ver': ['reparaciones.gestionar'],
  'reparaciones.crear': ['reparaciones.gestionar'],
  'reparaciones.diagnosticar': ['reparaciones.gestionar'],
  'reparaciones.editar': ['reparaciones.gestionar'],
  'reparaciones.comunicar': ['reparaciones.gestionar'],
  'reparaciones.estado': ['reparaciones.gestionar'],
  'reparaciones.resolver': ['reparaciones.gestionar'],
  'reparaciones.cancelar': ['reparaciones.gestionar'],
  'reparaciones.costos.gestionar': ['reparaciones.gestionar'],
  'reparaciones.documentos.gestionar': ['reparaciones.gestionar'],
  'reparaciones.reportes.ver': ['reparaciones.gestionar'],
  'reparaciones.formularios.ver': ['reparaciones.gestionar'],
  'reparaciones.formularios.gestionar': ['reparaciones.gestionar'],
  'reparaciones.formularios.responder': ['reparaciones.gestionar'],
  'mantenimiento.preventivo.ver': ['reparaciones.gestionar'],
  'mantenimiento.preventivo.gestionar': ['reparaciones.gestionar'],
};

@Injectable()
export class PermissionsEvaluatorService {
  constructor(
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolesRepository: Repository<UsuarioRol>,
    @InjectRepository(RolPermiso)
    private readonly rolPermisosRepository: Repository<RolPermiso>,
    @InjectRepository(Permiso)
    private readonly permisosRepository: Repository<Permiso>,
  ) {}

  async hasAny(user: AuthenticatedUser, required: string[]): Promise<boolean> {
    if (!required.length) return true;
    const assignments = await this.usuarioRolesRepository.find({
      where: { empresaId: user.empresaId, usuarioId: user.userId },
    });
    if (!assignments.length) return false;
    const grants = await this.rolPermisosRepository.find({
      where: {
        empresaId: user.empresaId,
        rolId: In(assignments.map((assignment) => assignment.rolId)),
      },
    });
    if (!grants.length) return false;
    const accepted = Array.from(
      new Set(
        required.flatMap((permission) => [
          permission,
          ...(PERMISSION_ALIASES[permission] ?? []),
        ]),
      ),
    );
    const permissions = await this.permisosRepository.find({
      where: {
        id: In(grants.map((grant) => grant.permisoId)) as never,
        codigo: In(accepted) as never,
      },
    });
    return permissions.some((permission) => accepted.includes(permission.codigo));
  }

  async requireAny(user: AuthenticatedUser, required: string[]): Promise<void> {
    if (!(await this.hasAny(user, required))) {
      throw new ForbiddenException(
        `Se requiere uno de estos permisos: ${required.join(', ')}`,
      );
    }
  }
}
