import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class QueryBitacoraAuditoriaSistemaDto {
  @IsOptional()
  @IsUUID()
  usuarioActorId?: string;

  @IsOptional()
  @IsString()
  entidad?: string;

  @IsOptional()
  @IsString()
  accion?: string;

  @IsOptional()
  @IsIn(['equipos', 'telecom', 'compartido'])
  dominio?: string;

  @IsOptional()
  @IsIn(['exito', 'error'])
  resultado?: string;

  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limite?: number;
}
