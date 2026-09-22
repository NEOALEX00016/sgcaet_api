import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermisosService } from './permisos.service';
import { PermisosController } from './permisos.controller';
import { Permiso } from './entities/permiso.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permiso, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [PermisosController],
  providers: [PermisosService],
})
export class PermisosModule {}
