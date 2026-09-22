import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';
export class CreateDominiosEmpresaDto {
  [key: string]: unknown;
  @IsString() @Length(1, 255) hostname: string;
  @IsOptional() @IsBoolean() esPrincipal?: boolean;
  @IsOptional()
  @IsIn(['pendiente', 'verificado', 'fallido'])
  estadoVerificacion?: string;
  @IsOptional() @IsString() @Length(1, 120) tokenVerificacion?: string;
}
