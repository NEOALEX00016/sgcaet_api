import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateAtributosDinamicosActivoDto {
  @IsUUID()
  activoId: string;

  @IsString()
  @Length(2, 100)
  clave: string;

  @IsOptional()
  @IsString()
  valorTexto?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorNumero?: number;

  @IsOptional()
  @IsDateString()
  valorFecha?: string;

  @IsOptional()
  @IsBoolean()
  valorBooleano?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  unidad?: string;
}
