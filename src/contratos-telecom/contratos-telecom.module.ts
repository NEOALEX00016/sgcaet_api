import { Module } from '@nestjs/common';
import { ContratosTelecomService } from './contratos-telecom.service';
import { ContratosTelecomController } from './contratos-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContratoTelecom } from './entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContratoTelecom, Operadora, Usuario, BitacoraAuditoriaSistema])],
  controllers: [ContratosTelecomController],
  providers: [ContratosTelecomService],
})
export class ContratosTelecomModule {}
