import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidenciasService } from './evidencias.service';
import { EvidenciasController } from './evidencias.controller';
import { Evidencia } from './entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evidencia, BitacoraAuditoriaSistema])],
  controllers: [EvidenciasController],
  providers: [EvidenciasService],
})
export class EvidenciasModule {}
