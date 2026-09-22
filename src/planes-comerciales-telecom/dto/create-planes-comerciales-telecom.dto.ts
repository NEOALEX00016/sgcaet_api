import { IsBoolean, IsNumberString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
export class CreatePlanesComercialesTelecomDto {
  @IsUUID() poolTelecomId: string;
  @IsUUID() operadoraId: string;
  @IsString() @Length(2, 80) codigo: string;
  @IsString() @Length(2, 160) nombre: string;
  @IsOptional() @IsString() @Length(0, 2000) descripcion?: string;
  @IsOptional() @IsNumberString() minutosIncluidos?: string;
  @IsOptional() @IsNumberString() datosIncluidos?: string;
  @IsOptional() @IsString() @Length(2, 10) datosUnidad?: string;
  @IsOptional() @IsNumberString() smsIncluidos?: string;
  @IsOptional() @IsNumberString() costoMensual?: string;
  @IsOptional() @IsString() @Length(3, 3) moneda?: string;
  @IsOptional() @IsBoolean() estaActivo?: boolean;
}
