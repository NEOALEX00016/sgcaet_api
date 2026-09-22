import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
} from 'class-validator';

export class CreateEspecificacionTipoActivoDto {
  @ValidateIf((dto) => !dto.categoriaEquipoId)
  @IsUUID()
  tipoActivoId?: string;

  @ValidateIf((dto) => !dto.tipoActivoId)
  @IsUUID()
  categoriaEquipoId?: string;

  @IsString()
  @Length(2, 120)
  nombre: string;

  @IsOptional()
  @IsIn(['texto', 'numero', 'fecha', 'booleano'])
  tipoDato?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  unidad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  dependeDeClave?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  valorPredefinido?: string;

  @IsOptional()
  @IsBoolean()
  esObligatoria?: boolean;
}
