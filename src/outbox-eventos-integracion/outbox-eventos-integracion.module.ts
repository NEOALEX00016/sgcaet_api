import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEventoIntegracion } from './entities/outbox-evento-integracion.entity';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';
import { IntegracionesMesaAyudaModule } from '../integraciones-mesa-ayuda/integraciones-mesa-ayuda.module';
import { OutboxEventosIntegracionWorker } from './outbox-eventos-integracion.worker';
import { OutboxEventosIntegracionController } from './outbox-eventos-integracion.controller';
import { OutboxEventosIntegracionService } from './outbox-eventos-integracion.service';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OutboxEventoIntegracion,
      Solicitud,
      BitacoraAuditoriaSistema,
    ]),
    IntegracionesMesaAyudaModule,
  ],
  providers: [OutboxEventosIntegracionWorker, OutboxEventosIntegracionService],
  controllers: [OutboxEventosIntegracionController],
  exports: [TypeOrmModule, OutboxEventosIntegracionWorker, OutboxEventosIntegracionService],
})
export class OutboxEventosIntegracionModule {}
