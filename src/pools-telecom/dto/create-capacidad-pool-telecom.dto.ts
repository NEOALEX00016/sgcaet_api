import { IsBoolean, IsIn, IsNumberString, IsOptional, IsString, Length } from 'class-validator';
export class CreateCapacidadPoolTelecomDto {
  @IsIn(['minutos', 'datos', 'sms']) tipoCapacidad: string;
  @IsString() @Length(1, 20) unidad: string;
  @IsNumberString() cantidadContratada: string;
  @IsOptional() @IsNumberString() cantidadRolloverMaxima?: string;
  @IsOptional() @IsBoolean() rolloverHabilitado?: boolean;
}
