import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateUbicacioneDto {
  @IsString()
  @Length(2, 40)
  codigo: string;

  @IsString()
  @Length(2, 120)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  direccion?: string;

  @IsOptional()
  @Matches(/^-?\d{1,2}(\.\d{1,7})?$/)
  latitud?: string;

  @IsOptional()
  @Matches(/^-?\d{1,3}(\.\d{1,7})?$/)
  longitud?: string;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;
}
