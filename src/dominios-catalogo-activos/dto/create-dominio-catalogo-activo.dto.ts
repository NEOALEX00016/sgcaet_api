import { IsOptional, IsString, Length } from 'class-validator';
export class CreateDominioCatalogoActivoDto {
  @IsString() @Length(2, 50) codigo: string;
  @IsString() @Length(2, 120) nombre: string;
  @IsOptional() @IsString() @Length(2, 60) iconName?: string;
  @IsOptional() @IsString() @Length(2, 2000) descripcion?: string;
  @IsOptional() manejaLineas?: boolean;
  @IsOptional() manejaMinutos?: boolean;
  @IsOptional() manejaDatos?: boolean;
  @IsOptional() manejaSms?: boolean;
}
