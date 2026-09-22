import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreatePermisoDto {
  @IsString()
  @Length(4, 160)
  codigo: string;

  @IsString()
  @Length(2, 80)
  moduloClave: string;

  @IsString()
  @Length(2, 80)
  recursoClave: string;

  @IsString()
  @Length(2, 80)
  accionClave: string;

  @IsOptional()
  @IsString()
  @Length(2, 400)
  descripcion?: string;
}
