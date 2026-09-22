import { IsBoolean, IsIn, IsOptional, IsString, Length } from 'class-validator';

export class UpdateConfiguracionSolicitudesDto {
  @IsOptional() @IsBoolean() permitirEquipo?: boolean;
  @IsOptional() @IsBoolean() permitirPrestamoActividad?: boolean;
  @IsOptional() @IsBoolean() permitirPrestamoPermanente?: boolean;
  @IsOptional() @IsBoolean() permitirReparacionActivo?: boolean;
  @IsOptional() @IsBoolean() permitirTelecom?: boolean;
  @IsOptional() @IsBoolean() permitirRecargaMinutos?: boolean;
  @IsOptional() @IsIn(['equipos', 'mesa_ayuda']) responsableEquipo?:
    'equipos' | 'mesa_ayuda';
  @IsOptional() @IsString() @Length(1, 500) mensajePortal?: string;
}
