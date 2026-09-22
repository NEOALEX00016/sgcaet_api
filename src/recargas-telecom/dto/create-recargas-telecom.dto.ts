import { IsNumberString, IsOptional, IsString, IsUUID, Length } from 'class-validator';
export class CreateRecargasTelecomDto {
  @IsUUID() lineaTelefonicaId: string;
  @IsOptional() @IsUUID() personaId?: string;
  @IsOptional() @IsUUID() capacidadPoolId?: string;
  @IsString() @Length(2, 20) tipoCapacidad: string;
  @IsNumberString() cantidad: string;
  @IsString() @Length(1, 20) unidad: string;
  @IsString() @Length(8, 120) claveIdempotencia: string;
  @IsOptional() @IsString() @Length(0, 1000) motivo?: string;
}
