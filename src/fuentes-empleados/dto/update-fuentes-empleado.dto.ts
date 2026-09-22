import { CreateFuentesEmpleadoDto } from './create-fuentes-empleado.dto';
export class UpdateFuentesEmpleadoDto implements Partial<CreateFuentesEmpleadoDto> {
  nombre?: string;
  tipoFuente?: string;
  estado?: string;
  urlBase?: string;
  metodoAutenticacion?: string;
  usuarioTecnico?: string;
  secretoCifrado?: string;
  esquemaBd?: string;
  tablaOVista?: string;
  consultaSql?: string;
  mapeoCampos?: Record<string, unknown>;
  usaVerificacionBaja?: boolean;
}
