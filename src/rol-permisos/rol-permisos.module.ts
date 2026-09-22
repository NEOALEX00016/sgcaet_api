import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolPermisosService } from './rol-permisos.service';
import { RolPermisosController } from './rol-permisos.controller';
import { RolPermiso } from './entities/rol-permiso.entity';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RolPermiso,
      Rol,
      Permiso,
      Usuario,
      BitacoraAuditoriaSistema,
      UsuarioRol,
    ]),
  ],
  controllers: [RolPermisosController],
  providers: [RolPermisosService],
})
export class RolPermisosModule {}
