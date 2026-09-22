import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuarioRolesService } from './usuario-roles.service';
import { UsuarioRolesController } from './usuario-roles.controller';
import { UsuarioRol } from './entities/usuario-role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/role.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsuarioRol,
      Usuario,
      Rol,
      BitacoraAuditoriaSistema,
      RolPermiso,
      Permiso,
    ]),
  ],
  controllers: [UsuarioRolesController],
  providers: [UsuarioRolesService],
})
export class UsuarioRolesModule {}
