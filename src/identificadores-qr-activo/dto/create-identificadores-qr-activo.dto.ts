import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateIdentificadoresQrActivoDto {
  @IsUUID()
  activoId: string;

  @IsString()
  @Length(4, 160)
  codigoQr: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
