import { CreateEventosPersonaLaboralDto } from './create-eventos-persona-laboral.dto';
export class UpdateEventosPersonaLaboralDto implements Partial<CreateEventosPersonaLaboralDto> {
  personaId?: string;
  fuenteEmpleadosId?: string;
  tipoEvento?: string;
  estadoAnterior?: string;
  estadoNuevo?: string;
  payload?: Record<string, unknown>;
  detectadoEn?: string;
}
