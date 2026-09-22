import { Module } from '@nestjs/common';
import { RecargasTelecomService } from './recargas-telecom.service';
import { RecargasTelecomController } from './recargas-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecargaTelecom } from './entities/recargas-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PoliticaRecargaTelecom } from '../politicas-recarga-telecom/entities/politicas-recarga-telecom.entity';
import { CapacidadPoolTelecom } from '../pools-telecom/entities/capacidades-pool-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { MovimientosTelecom } from '../movimientos-telecom/entities/movimientos-telecom.entity';
import { ReglasNegocioModule } from '../reglas-negocio/reglas-negocio.module';

@Module({
  imports: [TypeOrmModule.forFeature([RecargaTelecom, LineaTelefonica, PoliticaRecargaTelecom, CapacidadPoolTelecom, Usuario, BitacoraAuditoriaSistema, MovimientosTelecom]), ReglasNegocioModule],
  controllers: [RecargasTelecomController],
  providers: [RecargasTelecomService],
})
export class RecargasTelecomModule {}
