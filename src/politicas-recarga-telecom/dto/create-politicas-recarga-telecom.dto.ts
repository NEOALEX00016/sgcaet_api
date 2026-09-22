import { IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsNumberString, IsObject, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';
export class CreatePoliticasRecargaTelecomDto {
  @IsString() @Length(2, 100) clave: string;
  @IsString() @Length(2, 160) nombre: string;
  @IsArray() @IsIn(['minutos', 'datos', 'sms'], { each: true }) tiposCapacidad: string[];
  @IsOptional() @IsString() @IsIn(['tenant', 'contrato', 'operadora', 'plan', 'linea', 'persona', 'departamento']) alcanceTipo?: string;
  @IsOptional() @IsUUID() alcanceId?: string;
  @IsOptional() @IsBoolean() requiereAprobacion?: boolean;
  @IsOptional() @IsNumberString() limiteCantidad?: string;
  @IsOptional() @IsInt() @Min(1) limiteSolicitudesCiclo?: number;
  @IsOptional() @IsObject() configuracionRegla?: Record<string, unknown>;
  @IsOptional() @IsDateString() vigenteDesde?: string;
  @IsOptional() @IsDateString() vigenteHasta?: string;
  @IsOptional() @IsIn(['borrador', 'activa', 'suspendida', 'archivada']) estado?: string;
}
