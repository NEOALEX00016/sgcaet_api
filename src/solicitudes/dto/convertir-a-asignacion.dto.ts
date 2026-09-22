import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ConvertirASolicitudAsignacionDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsUUID()
  ubicacionId?: string;

  @IsOptional()
  @IsDateString()
  fechaAsignacion: string;

  @IsOptional()
  @IsDateString()
  fechaPrevistaDevolucion?: string;

  @IsOptional()
  @IsString()
  @Length(2, 1000)
  motivo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;
}
