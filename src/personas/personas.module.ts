import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonasService } from './personas.service';
import { PersonasController } from './personas.controller';
import { Persona } from './entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { EjecucionesCargaEmpleado } from '../ejecuciones-carga-empleados/entities/ejecuciones-carga-empleado.entity';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { PersonaEstructuraOrganizacional } from '../persona-estructura-organizacional/entities/persona-estructura-organizacional.entity';
import { EventosPersonaLaboral } from '../eventos-persona-laboral/entities/eventos-persona-laboral.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { SecureHttpClientModule } from '../common/http/secure-http-client.module';
import { SecurityModule } from '../common/security/security.module';
import { PersonasSyncSchedulerService } from './personas-sync-scheduler.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Persona,
      Usuario,
      BitacoraAuditoriaSistema,
      FuentesEmpleado,
      EjecucionesCargaEmpleado,
      EstructuraOrganizacionalNodo,
      PersonaEstructuraOrganizacional,
      EventosPersonaLaboral,
      Asignacion,
      AsignacionRecurso,
    ]),
    SecureHttpClientModule,
    SecurityModule,
  ],
  controllers: [PersonasController],
  providers: [PersonasService, PersonasSyncSchedulerService],
})
export class PersonasModule {}
