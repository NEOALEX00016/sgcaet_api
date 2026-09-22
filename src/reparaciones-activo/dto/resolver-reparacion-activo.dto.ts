import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsIn, IsOptional, IsString, Length, ValidateNested } from 'class-validator';

export class CambioComponenteDto {
  @IsString()
  @Length(1, 100)
  clave: string;

  @IsString()
  @Length(1, 180)
  nombre: string;

  @IsString()
  @Length(1, 1000)
  valorNuevo: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  unidad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  motivo?: string;
}

export class ResolverReparacionActivoDto {
  @IsIn(['resuelto', 'parcial', 'sin_reparacion', 'reemplazo_requerido'])
  resultado: string;

  @IsString()
  @Length(3, 4000)
  resolucion: string;

  @IsDateString()
  fechaSalida: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CambioComponenteDto)
  cambiosComponentes: CambioComponenteDto[];
}
