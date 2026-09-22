import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmpresasService } from './empresas.service';
import { EmpresasController } from './empresas.controller';
import { Empresa } from './entities/empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Empresa, BitacoraAuditoriaSistema, Usuario, Rol, Permiso, RolPermiso, UsuarioRol]),
  ],
  controllers: [EmpresasController],
  providers: [EmpresasService, TargetTenantContextService],
})
export class EmpresasModule {}
