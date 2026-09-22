import { CreatePersonaEstructuraOrganizacionalDto } from './create-persona-estructura-organizacional.dto';
export class UpdatePersonaEstructuraOrganizacionalDto implements Partial<CreatePersonaEstructuraOrganizacionalDto> {
  personaId?: string;
  estructuraNodoId?: string;
  rolEnNodo?: string;
  esPrincipal?: boolean;
  iniciaEn?: string;
  finalizaEn?: string;
}
