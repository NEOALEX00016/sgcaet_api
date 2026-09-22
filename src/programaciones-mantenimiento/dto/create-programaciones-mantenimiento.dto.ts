import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

export class CreateProgramacionesMantenimientoDto {
  @IsUUID()
  activoId: string;

  @ValidateIf((_object, value) => value !== undefined && value !== null)
  @IsUUID()
  formularioId?: string | null;

  @IsString()
  @Length(2, 140)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  descripcion?: string;

  @IsInt()
  @Min(1)
  @Max(36500)
  frecuenciaDias: number;

  @IsDateString()
  proximaFecha: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(36500)
  anticipacionDias?: number;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;
}
