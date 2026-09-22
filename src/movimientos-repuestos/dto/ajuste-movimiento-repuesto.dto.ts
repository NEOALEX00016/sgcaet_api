import { IsIn, IsNumberString, IsOptional, IsString, IsUUID, Length, Matches } from 'class-validator';

export class AjusteMovimientoRepuestoDto {
  @IsUUID() piezaRepuestoId: string;
  @IsIn(['ajuste_pos', 'ajuste_neg']) tipoMovimiento: 'ajuste_pos' | 'ajuste_neg';
  @IsNumberString()
  @Matches(/^(?:0*[1-9]\d*(?:\.\d+)?|0*\.\d*[1-9]\d*)$/, { message: 'cantidad debe ser mayor que cero' })
  cantidad: string;
  @IsString() @Length(1, 2000) motivo: string;
  @IsOptional() @IsString() @Length(1, 180) referencia?: string;
}
