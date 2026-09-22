import { IsOptional, IsString, IsUrl, Length } from 'class-validator';
export class CreateMarcasEmpresaDto {
  [key: string]: unknown;
  @IsOptional() @IsUrl() logoUrl?: string;
  @IsOptional() @IsUrl() logoOscuroUrl?: string;
  @IsOptional() @IsUrl() faviconUrl?: string;
  @IsOptional() @IsString() @Length(1, 20) colorPrimario?: string;
  @IsOptional() @IsString() @Length(1, 20) colorSecundario?: string;
  @IsOptional() @IsString() @Length(1, 20) colorAcento?: string;
}
