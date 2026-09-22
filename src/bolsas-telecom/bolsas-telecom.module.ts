import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BolsasTelecomService } from './bolsas-telecom.service';
import { BolsasTelecomController } from './bolsas-telecom.controller';
import { BolsaTelecom } from './entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BolsaTelecom,
      Usuario,
      LineaTelefonica,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [BolsasTelecomController],
  providers: [BolsasTelecomService],
})
export class BolsasTelecomModule {}
