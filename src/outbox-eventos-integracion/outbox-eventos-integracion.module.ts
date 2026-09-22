import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEventoIntegracion } from './entities/outbox-evento-integracion.entity';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';
import { IntegracionesMesaAyudaModule } from '../integraciones-mesa-ayuda/integraciones-mesa-ayuda.module';
import { OutboxEventosIntegracionWorker } from './outbox-eventos-integracion.worker';
import { OutboxEventosIntegracionController } from './outbox-eventos-integracion.controller';
import { OutboxEventosIntegracionService } from './outbox-eventos-integracion.service';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Activo } from '../activos/entities/activo.entity';
import { ConfiguracionOperativaTenantModule } from '../configuracion-operativa-tenant/configuracion-operativa-tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboxEventoIntegracion,
      Solicitud,
      BitacoraAuditoriaSistema,
      ReparacionActivo,
      Asignacion,
      Persona,
      Activo,
    ]),
    IntegracionesMesaAyudaModule,
    ConfiguracionOperativaTenantModule,
  ],
  providers: [OutboxEventosIntegracionWorker, OutboxEventosIntegracionService],
  controllers: [OutboxEventosIntegracionController],
  exports: [TypeOrmModule, OutboxEventosIntegracionWorker, OutboxEventosIntegracionService],
})
export class OutboxEventosIntegracionModule {}
