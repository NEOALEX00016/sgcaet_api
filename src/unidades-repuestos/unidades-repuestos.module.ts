import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnidadesRepuestosService } from './unidades-repuestos.service';
import { UnidadesRepuestosController } from './unidades-repuestos.controller';
import { UnidadRepuesto } from './entities/unidades-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([UnidadRepuesto, PiezaRepuesto, MovimientoRepuesto, BitacoraAuditoriaSistema])],
  controllers: [UnidadesRepuestosController],
  providers: [UnidadesRepuestosService],
})
export class UnidadesRepuestosModule {}
