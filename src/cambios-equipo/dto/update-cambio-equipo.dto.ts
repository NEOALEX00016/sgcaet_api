import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateCambioEquipoDto {
  @IsOptional()
  @IsString()
  @Length(3, 2000)
  motivo?: string;

  @IsOptional()
  @IsUUID()
  autorizadoPor?: string;

  @IsOptional()
  @IsDateString()
  ejecutadoEn?: string;
}
