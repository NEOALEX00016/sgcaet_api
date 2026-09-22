import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreateTiposAsignacionDto {
  @IsString()
  @Length(2, 60)
  codigo: string;

  @IsString()
  @Length(2, 140)
  nombre: string;

  @IsOptional()
  @IsIn(['equipos', 'telecom', 'flota_vehicular', 'combustible'])
  dominio?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  requiereFormulario?: boolean;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
