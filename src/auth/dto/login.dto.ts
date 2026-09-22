import { IsEmail, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsEmail()
  correo: string;

  @IsString()
  @Length(8, 200)
  contrasena: string;
}
