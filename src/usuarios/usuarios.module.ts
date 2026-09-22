import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { Usuario } from './entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, BitacoraAuditoriaSistema])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
