import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MovimientosRepuestosService } from './movimientos-repuestos.service';
import { MovimientosRepuestosController } from './movimientos-repuestos.controller';
import { MovimientoRepuesto } from './entities/movimientos-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MovimientoRepuesto, PiezaRepuesto, UnidadRepuesto, ExistenciaRepuesto, BitacoraAuditoriaSistema])],
  controllers: [MovimientosRepuestosController],
  providers: [MovimientosRepuestosService],
})
export class MovimientosRepuestosModule {}
