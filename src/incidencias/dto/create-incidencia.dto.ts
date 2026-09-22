import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateIncidenciaDto {
  @IsOptional()
  @IsUUID()
  auditoriaDetalleId?: string;

  @IsOptional()
  @IsUUID()
  activoId?: string;

  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsString()
  @Length(2, 50)
  codigo: string;

  @IsString()
  @Length(3, 180)
  titulo: string;

  @IsOptional()
  @IsString()
  @Length(2, 5000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @IsIn(['abierta', 'en_investigacion', 'resuelta', 'cerrada', 'cancelada'])
  estado?: string;

  @IsOptional()
  @IsString()
  @IsIn(['baja', 'media', 'alta', 'critica'])
  prioridad?: string;

  @IsOptional()
  @IsUUID()
  reportadaPor?: string;

  @IsOptional()
  @IsUUID()
  asignadaA?: string;

  @IsOptional()
  @IsDateString()
  abiertaEn?: string;

  @IsOptional()
  @IsDateString()
  cerradaEn?: string;

}
