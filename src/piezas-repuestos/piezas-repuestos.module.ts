import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiezasRepuestosService } from './piezas-repuestos.service';
import { PiezasRepuestosController } from './piezas-repuestos.controller';
import { PiezaRepuesto } from './entities/piezas-repuesto.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PiezaRepuesto, EspecificacionTipoActivo, Activo, TiposActivo, BitacoraAuditoriaSistema, ExistenciaRepuesto, UnidadRepuesto, MovimientoRepuesto, ComponenteInstaladoActivo])],
  controllers: [PiezasRepuestosController],
  providers: [PiezasRepuestosService],
})
export class PiezasRepuestosModule {}
