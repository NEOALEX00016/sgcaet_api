import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateReparacionActivoDto {
  @IsOptional()
  @IsString()
  @Length(3, 4000)
  diagnostico?: string;

  @IsOptional()
  @IsString()
  @Length(3, 180)
  proveedorTecnico?: string;

  @IsOptional()
  @IsNumberString()
  costo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsString()
  @IsIn(['abierta', 'en_proceso', 'esperando_repuestos', 'cancelada'])
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
