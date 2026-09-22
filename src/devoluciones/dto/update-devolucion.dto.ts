import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateDevolucionDto {
  @IsOptional()
  @IsString()
  @IsIn(['correcto', 'danado', 'incompleto', 'perdido'])
  condicionActivo?: string;

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
}
