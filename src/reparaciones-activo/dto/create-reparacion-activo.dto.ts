import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateReparacionActivoDto {
  @IsUUID()
  activoId: string;

  @IsOptional()
  @IsUUID()
  asignacionId?: string;

  @IsString()
  @IsIn(['reparacion', 'mantenimiento'])
  tipoServicio: string;

  @IsString()
  @Length(3, 4000)
  diagnostico: string;

  @IsOptional()
  @IsString()
  @Length(3, 180)
  proveedorTecnico?: string;

  @IsOptional()
  @IsNumberString()
  @Matches(/^\d+(?:\.\d+)?$/, { message: 'costo no puede ser negativo' })
  costo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsDateString()
  fechaIngreso: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  @IsIn(['abierta', 'en_proceso', 'esperando_repuestos'])
  estado?: string;

  @IsOptional()
  @IsString()
  @IsIn(['resuelto', 'parcial', 'sin_reparacion', 'reemplazo_requerido'])
  resultado?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;

}
