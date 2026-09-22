import { IsIn, IsOptional, IsString, Length } from 'class-validator';

export class CreatePersonaDto {
  @IsString()
  @Length(2, 50)
  codigoInterno: string;

  @IsString()
  @Length(2, 120)
  nombres: string;

  @IsString()
  @Length(2, 120)
  apellidos: string;

  @IsOptional()
  @IsString()
  @IsIn(['cedula', 'pasaporte', 'rnc', 'otro'])
  tipoDocumento?: string;

  @IsString()
  @Length(3, 30)
  numeroDocumento: string;

  @IsOptional()
  @IsString()
  @Length(5, 180)
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(7, 40)
  telefono?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo', 'suspendido'])
  estado?: string;
}
