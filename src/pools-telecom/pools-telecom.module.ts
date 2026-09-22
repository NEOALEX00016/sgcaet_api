import { Module } from '@nestjs/common';
import { PoolsTelecomService } from './pools-telecom.service';
import { PoolsTelecomController } from './pools-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoolTelecom } from './entities/pools-telecom.entity';
import { CapacidadPoolTelecom } from './entities/capacidades-pool-telecom.entity';
import { ContratoTelecom } from '../contratos-telecom/entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PoolTelecom, CapacidadPoolTelecom, ContratoTelecom, Operadora, Usuario, BitacoraAuditoriaSistema])],
  controllers: [PoolsTelecomController],
  providers: [PoolsTelecomService],
})
export class PoolsTelecomModule {}
