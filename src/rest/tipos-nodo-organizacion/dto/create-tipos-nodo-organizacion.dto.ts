import {
  IsBoolean,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateTiposNodoOrganizacionDto {
  @IsString()
  @Length(2, 60)
  @Matches(/^[a-z0-9_]+$/, {
    message:
      'codigo solo permite minusculas, numeros y guion bajo (snake_case)',
  })
  codigo: string;

  @IsString()
  @Length(2, 120)
  nombreVisible: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
