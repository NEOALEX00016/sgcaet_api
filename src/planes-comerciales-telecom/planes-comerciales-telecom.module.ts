import { Module } from '@nestjs/common';
import { PlanesComercialesTelecomService } from './planes-comerciales-telecom.service';
import { PlanesComercialesTelecomController } from './planes-comerciales-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanComercialTelecom } from './entities/planes-comerciales-telecom.entity';
import { PoolTelecom } from '../pools-telecom/entities/pools-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PlanComercialTelecom, PoolTelecom, Operadora, Usuario, BitacoraAuditoriaSistema])],
  controllers: [PlanesComercialesTelecomController],
  providers: [PlanesComercialesTelecomService],
})
export class PlanesComercialesTelecomModule {}
