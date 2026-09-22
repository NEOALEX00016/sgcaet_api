import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosTelecomService } from './movimientos-telecom.service';
import { MovimientosTelecomController } from './movimientos-telecom.controller';
import { MovimientosTelecom } from './entities/movimientos-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MovimientosTelecom,
      LineaTelefonica,
      BolsaTelecom,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [MovimientosTelecomController],
  providers: [MovimientosTelecomService],
})
export class MovimientosTelecomModule {}
