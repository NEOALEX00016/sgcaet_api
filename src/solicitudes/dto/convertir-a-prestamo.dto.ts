import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ConvertirASolicitudPrestamoDto {
  @IsOptional()
  @IsUUID()
  activoId: string;

  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsDateString()
  fechaSalida?: string;

  @IsOptional()
  @IsDateString()
  fechaPrevistaRetorno?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;
}
