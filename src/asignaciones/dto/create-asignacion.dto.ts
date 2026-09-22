import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAsignacionDto {
  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsUUID()
  ubicacionId?: string;

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
  @IsUUID()
  autorizadoPor?: string;

  @IsOptional()
  @IsUUID()
  entregadoPor?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'borrador',
    'pendiente_autorizacion',
    'autorizada',
    'entregada',
    'rechazada',
    'cancelada',
    'finalizada',
  ])
  estado?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;

  @IsOptional()
  @IsUUID()
  formularioVersionId?: string;

  @IsOptional()
  @IsUUID()
  tipoAsignacionId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 2048)
  firmaUrl?: string;
}
