import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionRecursosService } from './asignacion-recursos.service';
import { AsignacionRecursosController } from './asignacion-recursos.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsignacionRecurso,
      Asignacion,
      Activo,
      LineaTelefonica,
      SuscripcionesLinea,
      Usuario,
      BitacoraAuditoriaSistema,
      UsuarioRol,
      RolPermiso,
      Permiso,
      ReparacionActivo,
    ]),
  ],
  controllers: [AsignacionRecursosController],
  providers: [AsignacionRecursosService],
})
export class AsignacionRecursosModule {}
