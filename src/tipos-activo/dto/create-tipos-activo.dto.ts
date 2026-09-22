import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateTiposActivoDto {
  @IsString()
  @Length(2, 50)
  codigo: string;
  @IsOptional() @IsUUID() categoriaEquipoId?: string;

  @IsString()
  @Length(2, 120)
  nombre: string;
  @IsOptional() @IsString() @Length(2, 60) iconName?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
