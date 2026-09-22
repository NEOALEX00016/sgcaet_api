import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateEmpresaDto {
  @IsString()
  @Length(2, 50)
  codigo: string;

  @IsString()
  @Length(2, 180)
  nombreLegal: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  nombreComercial?: string;

  @IsString()
  @Matches(/^[A-Z]{2}$/)
  codigoPais: string;

  @IsString()
  @Length(2, 20)
  tipoIdentificacionFiscal: string;

  @IsString()
  @Length(4, 30)
  numeroIdentificacionFiscal: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  @Length(7, 40)
  telefono?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  sitioWeb?: string;

  @IsOptional()
  @IsString()
  @Length(3, 60)
  zonaHoraria?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{3}$/)
  moneda?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'inactiva', 'suspendida', 'prueba'])
  estado?: string;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;

  @IsEmail()
  adminCorreo: string;

  @IsString()
  @Length(2, 120)
  adminNombres: string;

  @IsString()
  @Length(2, 120)
  adminApellidos: string;

  @IsString()
  @Length(8, 200)
  adminContrasena: string;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  adminNombreUsuario?: string;
}
