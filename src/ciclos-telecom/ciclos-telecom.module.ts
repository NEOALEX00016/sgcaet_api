import { Module } from '@nestjs/common';
import { CiclosTelecomService } from './ciclos-telecom.service';
import { CiclosTelecomController } from './ciclos-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CicloTelecom } from './entities/ciclos-telecom.entity';
import { PoolTelecom } from '../pools-telecom/entities/pools-telecom.entity';
import { CapacidadPoolTelecom } from '../pools-telecom/entities/capacidades-pool-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CicloTelecom, PoolTelecom, CapacidadPoolTelecom, Usuario, BitacoraAuditoriaSistema])],
  controllers: [CiclosTelecomController],
  providers: [CiclosTelecomService],
})
export class CiclosTelecomModule {}
