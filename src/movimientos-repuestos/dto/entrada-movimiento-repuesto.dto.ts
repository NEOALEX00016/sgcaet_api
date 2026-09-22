import { IsArray, IsNumberString, IsOptional, IsString, IsUUID, Length, Matches, ValidateIf } from 'class-validator';

export class EntradaMovimientoRepuestoDto {
  @IsUUID() piezaRepuestoId: string;
  @ValidateIf((dto: EntradaMovimientoRepuestoDto) => !dto.unidades?.length)
  @IsNumberString()
  @Matches(/^(?:0*[1-9]\d*(?:\.\d+)?|0*\.\d*[1-9]\d*)$/, { message: 'cantidad debe ser mayor que cero' })
  cantidad?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) unidades?: string[];
  @IsOptional() @IsNumberString() costoEntrada?: string;
  @IsOptional() @IsString() @Length(3, 3) moneda?: string;
  @IsOptional() @IsString() @Length(1, 2000) motivo?: string;
  @IsOptional() @IsString() @Length(1, 180) referencia?: string;
}
