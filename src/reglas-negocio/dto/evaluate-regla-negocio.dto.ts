import { IsDateString, IsObject, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class EvaluateReglaNegocioDto {
  @IsString() @Length(2, 40) dominio: string;
  @IsString() @Length(2, 160) clave: string;
  @IsOptional() @IsObject() contexto?: Record<string, string>;
  @IsOptional() @IsDateString() evaluadaEn?: string;
  @IsOptional() @IsString() @Length(2, 80) entidadTipo?: string;
  @IsOptional() @IsUUID() entidadId?: string;
  @IsOptional() @IsObject() resultado?: Record<string, unknown>;
}
