import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAuditoriaDetalleDto {
  @IsUUID()
  auditoriaId: string;

  @IsUUID()
  activoId: string;

  @IsOptional()
  @IsString()
  @IsIn(['equipos', 'telecom', 'flota_vehicular', 'combustible'])
  dominio?: string;

  @IsOptional()
  @IsUUID()
  personaReportadaId?: string;

  @IsString()
  @IsIn([
    'localizado',
    'no_localizado',
    'con_diferencia',
    'danado',
    'sin_asignacion',
    'asignado_incorrectamente',
  ])
  resultado: string;

  @IsOptional()
  @IsString()
  @Length(2, 3000)
  condicionReportada?: string;

  @IsOptional()
  @IsString()
  @Length(2, 3000)
  observaciones?: string;

  @IsOptional()
  @IsUUID()
  firmadoPor?: string;

  @IsOptional()
  @IsDateString()
  confirmadoEn?: string;
}
