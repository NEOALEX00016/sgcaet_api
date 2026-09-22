import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriasService } from './auditorias.service';
import { AuditoriasController } from './auditorias.controller';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Auditoria, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [AuditoriasController],
  providers: [AuditoriasService],
})
export class AuditoriasModule {}
