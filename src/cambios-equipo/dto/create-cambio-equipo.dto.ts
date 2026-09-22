import {
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateCambioEquipoDto {
  @IsUUID()
  asignacionId: string;

  @IsUUID()
  activoAnteriorId: string;

  @IsUUID()
  activoNuevoId: string;

  @IsString()
  @Length(3, 2000)
  motivo: string;

  @IsOptional()
  @IsUUID()
  autorizadoPor?: string;

  @IsOptional()
  @IsDateString()
  ejecutadoEn?: string;

  @IsOptional()
  @IsUUID()
  documentoId?: string;
}
