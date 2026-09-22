import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateFormularioDto {
  @IsString()
  @Length(2, 50)
  codigo: string;

  @IsString()
  @Length(3, 140)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsString()
  @IsIn([
    'asignacion',
    'prestamo',
    'devolucion',
    'cambio_equipo',
    'descargo',
    'asignacion_linea',
    'devolucion_linea',
    'asignacion_equipo_telecom',
    'devolucion_equipo_telecom',
    'descargo_equipo_telecom',
    'asignacion_vehiculo',
    'devolucion_vehiculo',
    'asignacion_combustible',
    'cierre_combustible',
    'auditoria',
    'incidencia',
    'mantenimiento',
    'general',
  ])
  tipoUso: string;

  @IsOptional()
  @IsIn(['equipos', 'telecom', 'flota_vehicular', 'combustible'])
  dominio?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
