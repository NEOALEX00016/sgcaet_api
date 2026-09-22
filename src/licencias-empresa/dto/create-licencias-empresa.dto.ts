import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  ValidateIf,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateLicenciasEmpresaDto {
  @IsIn(['prueba', 'mensual', 'anual', 'perpetua'])
  tipoLicencia: string;

  @IsOptional()
  @IsIn(['activa', 'vencida', 'suspendida', 'cancelada'])
  estado?: string;

  @IsISO8601()
  iniciaEn: string;

  @ValidateIf((value) => value.tipoLicencia !== 'perpetua')
  @IsISO8601()
  venceEn?: string;

  @IsOptional()
  @IsISO8601()
  graciaHasta?: string;

  @IsOptional()
  @IsBoolean()
  modoSoloLecturaAlVencer?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteUsuarios?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteActivos?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  limiteLineas?: number;

  @IsOptional()
  funcionalidades?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  payloadFirmado?: string;

  @IsOptional()
  @IsString()
  firmaLicencia?: string;
}
