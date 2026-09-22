import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreatePrestamoActivoDto {
  @IsUUID()
  activoId: string;

  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsUUID()
  entregadoPor?: string;

  @IsDateString()
  fechaSalida: string;

  @IsOptional()
  @IsDateString()
  fechaPrevistaRetorno?: string;

  @IsOptional()
  @IsString()
  @IsIn(['prestado', 'devuelto', 'vencido', 'cancelado'])
  estado?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;
}
