import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SuscripcionesLineaService } from './suscripciones-linea.service';
import { SuscripcionesLineaController } from './suscripciones-linea.controller';
import { SuscripcionesLinea } from './entities/suscripciones-linea.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { PlanComercialTelecom } from '../planes-comerciales-telecom/entities/planes-comerciales-telecom.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SuscripcionesLinea,
      LineaTelefonica,
      PlanesTelefonico,
      Usuario,
      BitacoraAuditoriaSistema,
      PlanComercialTelecom,
    ]),
  ],
  controllers: [SuscripcionesLineaController],
  providers: [SuscripcionesLineaService],
})
export class SuscripcionesLineaModule {}
