import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IntegracionMesaAyuda } from './entities/integracion-mesa-ayuda.entity';
import { EventoIntegracionMesaAyuda } from './entities/evento-integracion-mesa-ayuda.entity';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { IntegracionesMesaAyudaService } from './integraciones-mesa-ayuda.service';
import { IntegracionesMesaAyudaController } from './integraciones-mesa-ayuda.controller';
import { SecureHttpClientModule } from '../common/http/secure-http-client.module';
import { SecurityModule } from '../common/security/security.module';
import { ConfiguracionOperativaTenantModule } from '../configuracion-operativa-tenant/configuracion-operativa-tenant.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IntegracionMesaAyuda,
      EventoIntegracionMesaAyuda,
      Solicitud,
      BitacoraAuditoriaSistema,
    ]),
    SecureHttpClientModule,
    SecurityModule,
    ConfiguracionOperativaTenantModule,
  ],
  providers: [IntegracionesMesaAyudaService],
  controllers: [IntegracionesMesaAyudaController],
  exports: [IntegracionesMesaAyudaService],
})
export class IntegracionesMesaAyudaModule {}
