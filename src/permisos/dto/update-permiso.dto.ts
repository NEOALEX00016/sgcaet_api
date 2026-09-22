import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class UpdatePermisoDto {
  @IsOptional()
  @IsString()
  @Length(4, 160)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  moduloClave?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  recursoClave?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  accionClave?: string;

  @IsOptional()
  @IsString()
  @Length(2, 400)
  descripcion?: string;
}
