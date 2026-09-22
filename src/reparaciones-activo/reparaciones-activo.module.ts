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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReparacionActivo,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
      Asignacion,
      AsignacionRecurso,
      AtributosDinamicosActivo,
      HistorialComponentesActivo,
    ]),
  ],
  controllers: [ReparacionesActivoController],
  providers: [ReparacionesActivoService],
  exports: [ReparacionesActivoService],
})
export class ReparacionesActivoModule {}
