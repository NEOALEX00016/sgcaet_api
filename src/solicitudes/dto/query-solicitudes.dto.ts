import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class QuerySolicitudesDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['pendiente', 'aprobada', 'rechazada', 'cancelada', 'en_proceso'])
  estado?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activo', 'telecom'])
  tipoSolicitud?: string;

  @IsOptional()
  @IsString()
  @IsIn(['equipos', 'telecom'])
  dominio?: string;

  @IsOptional()
  @IsString()
  recursoTipo?: string;

  @IsOptional()
  @IsString()
  search?: string;
}
