import { IsDateString, IsNumberString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateUnidadesRepuestoDto {
  @IsUUID() piezaRepuestoId: string;
  @IsString() @Length(1, 160) numeroSerie: string;
  @IsOptional() @IsNumberString() costoEntrada?: string;
  @IsOptional() @IsString() @Length(3, 3) moneda?: string;
  @IsOptional() @IsDateString() garantiaHasta?: string;
}
