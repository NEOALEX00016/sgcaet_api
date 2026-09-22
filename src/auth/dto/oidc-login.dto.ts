import { IsEmail, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class OidcLoginDto {
  @IsIn(['microsoft', 'google'])
  proveedor: 'microsoft' | 'google';

  @IsString()
  @MaxLength(255)
  subjectExterno: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tenantExterno?: string;

  @IsEmail()
  correo: string;

  @IsOptional()
  @IsUUID()
  empresaId?: string;
}
