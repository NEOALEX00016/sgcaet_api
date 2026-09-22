import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateDevolucionDto {
  @IsUUID()
  asignacionId: string;

  @IsString()
  @IsIn(['correcto', 'danado', 'incompleto', 'perdido'])
  condicionActivo: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;

  @IsOptional()
  @IsUUID()
  recibidoPor?: string;

  @IsOptional()
  @IsDateString()
  recibidoEn?: string;

  @IsOptional()
  @IsUUID()
  documentoId?: string;
}
