import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateSuscripcionesLineaDto {
  @IsUUID()
  lineaTelefonicaId: string;

  @IsOptional()
  @IsUUID()
  planTelefonicoId?: string;

  @IsOptional()
  @IsUUID()
  planComercialTelecomId?: string;

  @IsDateString()
  iniciaEn: string;

  @IsOptional()
  @IsDateString()
  venceEn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'vencida', 'cancelada', 'suspendida'])
  estado?: string;
}
