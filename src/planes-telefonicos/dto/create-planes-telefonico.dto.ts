import {
  IsBoolean,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreatePlanesTelefonicoDto {
  @IsUUID()
  operadoraId: string;

  @IsString()
  @Length(2, 50)
  codigo: string;

  @IsString()
  @Length(2, 120)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsOptional()
  @IsNumberString()
  costoMensual?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsBoolean()
  incluyeDatos?: boolean;

  @IsOptional()
  @IsBoolean()
  incluyeMinutos?: boolean;

  @IsOptional()
  @IsBoolean()
  incluyeSms?: boolean;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
