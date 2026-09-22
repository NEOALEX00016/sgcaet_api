import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReparacionesActivoService } from './reparaciones-activo.service';
import { ReparacionesActivoController } from './reparaciones-activo.controller';
import { ReparacionActivo } from './entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { HistorialComponentesActivo } from '../historial-componentes-activo/entities/historial-componentes-activo.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { FormulariosReparacionModule } from '../formularios-reparacion/formularios-reparacion.module';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { FormularioReparacion } from '../formularios-reparacion/entities/formularios-reparacion.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [
    FormulariosReparacionModule,
    TypeOrmModule.forFeature([
      ReparacionActivo,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
      Asignacion,
      AsignacionRecurso,
      AtributosDinamicosActivo,
      HistorialComponentesActivo,
      PiezaRepuesto,
      UnidadRepuesto,
      ExistenciaRepuesto,
      MovimientoRepuesto,
      ComponenteInstaladoActivo,
      EspecificacionTipoActivo,
      TiposActivo,
      OutboxEventoIntegracion,
      FormularioReparacion,
      DocumentEntity,
    ]),
  ],
  controllers: [ReparacionesActivoController],
  providers: [ReparacionesActivoService],
  exports: [ReparacionesActivoService],
})
export class ReparacionesActivoModule {}
