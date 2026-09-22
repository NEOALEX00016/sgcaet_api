import { IsBoolean, IsNumberString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreatePiezasRepuestoDto {
  @IsUUID() especificacionTipoActivoId: string;
  @IsString() @Length(1, 60) codigo: string;
  @IsString() @Length(2, 180) nombreComercial: string;
  @IsOptional() @IsString() @Length(1, 120) fabricante?: string;
  @IsOptional() @IsString() @Length(1, 120) modelo?: string;
  @IsOptional() @IsString() @Length(1, 120) numeroParte?: string;
  @IsOptional() @IsNumberString() capacidad?: string;
  @IsOptional() @IsString() @Length(1, 30) unidad?: string;
  @IsOptional() @IsBoolean() esSerializado?: boolean;
  @IsOptional() @IsNumberString() stockMinimo?: string;
  @IsOptional() @IsNumberString() costoReferencial?: string;
  @IsOptional() @IsString() @Length(3, 3) moneda?: string;
  @IsOptional() @IsBoolean() estaActiva?: boolean;
}
