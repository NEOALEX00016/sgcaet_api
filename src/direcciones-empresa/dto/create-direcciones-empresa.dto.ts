import { IsIn, IsOptional, IsString, Length } from 'class-validator';
export class CreateDireccionesEmpresaDto {
  [key: string]: unknown;
  @IsIn(['fiscal', 'operativa', 'facturacion']) tipoDireccion: string;
  @IsString() @Length(1, 255) linea1: string;
  @IsOptional() @IsString() @Length(1, 255) linea2?: string;
  @IsString() @Length(1, 120) ciudad: string;
  @IsString() @Length(1, 120) provinciaEstado: string;
  @IsOptional() @IsString() @Length(1, 20) codigoPostal?: string;
  @IsOptional() @IsString() @Length(2, 2) codigoPais?: string;
}
