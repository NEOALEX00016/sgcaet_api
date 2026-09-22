import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionesBolsaTelecomService } from './asignaciones-bolsa-telecom.service';
import { AsignacionesBolsaTelecomController } from './asignaciones-bolsa-telecom.controller';
import { AsignacionBolsaTelecom } from './entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsignacionBolsaTelecom,
      BolsaTelecom,
      Usuario,
      LineaTelefonica,
      SuscripcionesLinea,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [AsignacionesBolsaTelecomController],
  providers: [AsignacionesBolsaTelecomService],
})
export class AsignacionesBolsaTelecomModule {}
