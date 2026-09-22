import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateLineaTelefonicaDto {
  @IsOptional()
  @IsUUID()
  operadoraId?: string;

  @IsString()
  @Length(3, 30)
  numero: string;

  @IsOptional()
  @IsString()
  @Length(8, 50)
  iccid?: string;

  @IsOptional()
  @IsString()
  @IsIn(['solo_numero', 'voz', 'datos', 'voz_datos'])
  tipoLinea?: string;

  @IsOptional()
  @IsString()
  @IsIn(['registrada', 'activa', 'inactiva', 'suspendida', 'cancelada'])
  estado?: string;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;
}
