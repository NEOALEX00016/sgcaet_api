import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';

export class CreateDepartamentoDto {
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
  @IsBoolean()
  estaActivo?: boolean;
}
