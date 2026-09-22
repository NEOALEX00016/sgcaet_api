import { CreateEjecucionesCargaEmpleadoDto } from './create-ejecuciones-carga-empleado.dto';
export class UpdateEjecucionesCargaEmpleadoDto implements Partial<CreateEjecucionesCargaEmpleadoDto> {
  fuenteEmpleadosId?: string;
  tipoCarga?: string;
  estado?: string;
  totalRegistros?: number;
  creados?: number;
  actualizados?: number;
  sinCambios?: number;
  errores?: number;
  detalleError?: string;
  finalizadaEn?: string;
}
