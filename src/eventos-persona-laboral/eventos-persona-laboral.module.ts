import { Module } from '@nestjs/common';
import { EventosPersonaLaboralService } from './eventos-persona-laboral.service';
import { EventosPersonaLaboralController } from './eventos-persona-laboral.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventosPersonaLaboral } from './entities/eventos-persona-laboral.entity';
import { Persona } from '../personas/entities/persona.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventosPersonaLaboral,
      Persona,
      FuentesEmpleado,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [EventosPersonaLaboralController],
  providers: [EventosPersonaLaboralService],
})
export class EventosPersonaLaboralModule {}
