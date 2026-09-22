import { CreateEstructuraOrganizacionalNodoDto } from './create-estructura-organizacional-nodo.dto';
export class UpdateEstructuraOrganizacionalNodoDto implements Partial<CreateEstructuraOrganizacionalNodoDto> {
  nodoPadreId?: string;
  tipoNodo?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  estaActivo?: boolean;
}
