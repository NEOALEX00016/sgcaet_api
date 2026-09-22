import { IsDateString, IsOptional, IsString, IsUUID, Max, Min, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryEvaluacionesReglasDto {
  @IsOptional() @IsString() dominio?: string;
  @IsOptional() @IsString() clave?: string;
  @IsOptional() @IsUUID() reglaId?: string;
  @IsOptional() @IsUUID() entidadId?: string;
  @IsOptional() @IsString() entidadTipo?: string;
  @IsOptional() @IsDateString() desde?: string;
  @IsOptional() @IsDateString() hasta?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limite?: number;
}
