import { Module } from '@nestjs/common';
import { ProgramacionesMantenimientoService } from './programaciones-mantenimiento.service';
import { ProgramacionesMantenimientoController } from './programaciones-mantenimiento.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProgramacionMantenimiento } from './entities/programaciones-mantenimiento.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramacionMantenimiento,
      Activo,
      Formulario,
      ReparacionActivo,
      Asignacion,
      AsignacionRecurso,
      BitacoraAuditoriaSistema,
      OutboxEventoIntegracion,
    ]),
  ],
  controllers: [ProgramacionesMantenimientoController],
  providers: [ProgramacionesMantenimientoService],
})
export class ProgramacionesMantenimientoModule {}
