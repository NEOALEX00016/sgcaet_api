import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateUsuarioDto {
  @IsEmail()
  @Length(5, 180)
  correo: string;

  @IsOptional()
  @IsString()
  @Length(3, 80)
  nombreUsuario?: string;

  @IsString()
  @Length(2, 120)
  nombres: string;

  @IsString()
  @Length(2, 120)
  apellidos: string;

  @IsString()
  @Length(20, 200)
  @IsString()
  @Length(8, 200)
  contrasena: string;

  @IsOptional()
  @IsString()
  @IsIn(['activo', 'inactivo', 'bloqueado', 'invitado'])
  estado?: string;

  @IsOptional()
  debeCambiarContrasena?: boolean;
}
