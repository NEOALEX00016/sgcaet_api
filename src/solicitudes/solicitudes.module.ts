import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Solicitud } from './entities/solicitud.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { SolicitudesController } from './solicitudes.controller';
import { ConfiguracionSolicitudesModule } from '../configuracion-solicitudes/configuracion-solicitudes.module';
import { DominiosCatalogoActivosModule } from '../dominios-catalogo-activos/dominios-catalogo-activos.module';
import { SolicitudesService } from './solicitudes.service';
import { AsignacionesModule } from '../asignaciones/asignaciones.module';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { PrestamosActivoModule } from '../prestamos-activo/prestamos-activo.module';
import { ReparacionesActivoModule } from '../reparaciones-activo/reparaciones-activo.module';
import { PrestamoActivo } from '../prestamos-activo/entities/prestamos-activo.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';
import { Persona } from '../personas/entities/persona.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Solicitud,
      Usuario,
      Asignacion,
      PrestamoActivo,
      ReparacionActivo,
      OutboxEventoIntegracion,
      Persona,
      UsuarioRol,
      RolPermiso,
      Permiso,
    ]),
    ConfiguracionSolicitudesModule,
    DominiosCatalogoActivosModule,
    AsignacionesModule,
    PrestamosActivoModule,
    ReparacionesActivoModule,
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
})
export class SolicitudesModule {}
