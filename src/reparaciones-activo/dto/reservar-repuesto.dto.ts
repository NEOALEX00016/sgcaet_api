import { IsNumberString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ReservarRepuestoDto {
  @IsUUID()
  piezaRepuestoId: string;

  @IsOptional()
  @IsUUID()
  unidadRepuestoId?: string;

  @IsOptional()
  @IsNumberString()
  cantidad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  motivo?: string;
}
