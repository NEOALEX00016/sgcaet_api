import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateCategoriaEquipoDto {
  @IsUUID() dominioId: string;
  @IsString() @Length(2, 50) codigo: string;
  @IsString() @Length(2, 120) nombre: string;
  @IsOptional() @IsString() @Length(2, 60) iconName?: string;
  @IsOptional() @IsString() @Length(2, 2000) descripcion?: string;
}
