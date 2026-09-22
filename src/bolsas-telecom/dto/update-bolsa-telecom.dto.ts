import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateBolsaTelecomDto {
  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsOptional()
  @IsString()
  @IsIn(['global', 'linea'])
  alcance?: string;

  @IsOptional()
  @IsString()
  @IsIn(['minutos', 'datos', 'sms', 'saldo'])
  tipoBolsa?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  unidad?: string;

  @IsOptional()
  @IsDateString()
  iniciaEn?: string;

  @IsOptional()
  @IsDateString()
  venceEn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'vencida', 'suspendida', 'cancelada'])
  estado?: string;
}
