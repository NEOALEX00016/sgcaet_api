import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
} from 'class-validator';

export class CreateOperadoraDto {
  @IsString()
  @Length(2, 40)
  codigo: string;

  @IsString()
  @Length(2, 120)
  nombre: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  pais?: string;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;
}
