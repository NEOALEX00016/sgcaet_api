import { PartialType } from '@nestjs/swagger';
import { CreateAsignacionesLineaPersonaDto } from './create-asignaciones-linea-persona.dto';

export class UpdateAsignacionesLineaPersonaDto extends PartialType(CreateAsignacionesLineaPersonaDto) {}
