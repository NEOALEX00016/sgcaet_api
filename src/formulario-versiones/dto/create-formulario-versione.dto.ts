import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateFormularioVersioneDto {
  @IsUUID()
  formularioId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(9999)
  versionNumero?: number;

  @IsOptional()
  @IsString()
  @IsIn(['borrador', 'publicada', 'archivada'])
  estado?: string;

  @IsOptional()
  @IsString()
  @Length(3, 200000)
  plantillaHtml?: string;
}
