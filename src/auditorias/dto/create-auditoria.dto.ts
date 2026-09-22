import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateAuditoriaDto {
  @IsString()
  @Length(2, 50)
  codigo: string;

  @IsString()
  @IsIn([
    'programada',
    'extraordinaria',
    'por_activo',
    'por_persona',
    'por_departamento',
    'por_ubicacion',
    'por_tipo_activo',
    'general',
  ])
  tipoAuditoria: string;

  @IsOptional()
  @IsString()
  @IsIn(['equipos', 'telecom', 'flota_vehicular', 'combustible'])
  dominio?: string;

  @IsOptional()
  @IsString()
  @IsIn(['general', 'categoria', 'tipo'])
  alcanceTipo?: 'general' | 'categoria' | 'tipo';

  @IsOptional()
  @IsUUID()
  alcanceId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(3650)
  periodicidadDias?: number;

  @IsOptional()
  @IsDateString()
  fechaProgramada?: string;

  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @IsOptional()
  @IsDateString()
  fechaCierre?: string;

  @IsOptional()
  @IsString()
  @IsIn(['programada', 'en_ejecucion', 'cerrada', 'cancelada'])
  estado?: string;

  @IsOptional()
  @IsUUID()
  creadaPor?: string;
}
