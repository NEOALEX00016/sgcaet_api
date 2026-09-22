import { CreateTiposNodoOrganizacionDto } from './create-tipos-nodo-organizacion.dto';

export class UpdateTiposNodoOrganizacionDto
  implements Partial<CreateTiposNodoOrganizacionDto>
{
  codigo?: string;
  nombreVisible?: string;
  descripcion?: string;
  estaActivo?: boolean;
}
