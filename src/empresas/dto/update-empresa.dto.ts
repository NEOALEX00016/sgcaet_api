import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateEmpresaDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  nombreLegal?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  nombreComercial?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Z]{2}$/)
  codigoPais?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  tipoIdentificacionFiscal?: string;

  @IsOptional()
  @IsString()
  @Length(4, 30)
  numeroIdentificacionFiscal?: string;

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
}
