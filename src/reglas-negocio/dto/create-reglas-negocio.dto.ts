import { IsDateString, IsIn, IsInt, IsObject, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateReglasNegocioDto {
  @IsString() @IsIn(['equipos', 'telecom', 'flota_telecom', 'flota_vehicular', 'combustible']) dominio: string;
  @IsString() @Length(2, 160) clave: string;
  @IsString() @Length(2, 180) nombre: string;
  @IsOptional() @IsString() @Length(0, 2000) descripcion?: string;
  @IsOptional() @IsString() @IsIn(['tenant', 'contrato', 'operadora', 'plan', 'linea', 'persona', 'departamento', 'vehiculo', 'categoria']) alcanceTipo?: string;
  @IsOptional() @IsUUID() alcanceId?: string;
  @IsObject() configuracion: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(0) prioridad?: number;
  @IsOptional() @IsIn(['borrador', 'activa', 'suspendida', 'archivada']) estado?: string;
  @IsOptional() @IsDateString() vigenteDesde?: string;
  @IsOptional() @IsDateString() vigenteHasta?: string;
}
