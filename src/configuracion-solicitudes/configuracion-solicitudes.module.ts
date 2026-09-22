import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionSolicitudes } from './entities/configuracion-solicitudes.entity';
import { ConfiguracionSolicitudesService } from './configuracion-solicitudes.service';
import { ConfiguracionSolicitudesController } from './configuracion-solicitudes.controller';
import { IntegracionMesaAyuda } from '../integraciones-mesa-ayuda/entities/integracion-mesa-ayuda.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ConfiguracionSolicitudes, IntegracionMesaAyuda])],
  controllers: [ConfiguracionSolicitudesController],
  providers: [ConfiguracionSolicitudesService],
  exports: [ConfiguracionSolicitudesService],
})
export class ConfiguracionSolicitudesModule {}
