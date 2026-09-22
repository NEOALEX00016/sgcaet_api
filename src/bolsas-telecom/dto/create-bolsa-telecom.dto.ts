import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateBolsaTelecomDto {
  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsString()
  @IsIn(['global', 'linea'])
  alcance: string;

  @IsString()
  @IsIn(['minutos', 'datos', 'sms', 'saldo'])
  tipoBolsa: string;

  @IsString()
  @Length(2, 20)
  unidad: string;

  @IsDateString()
  iniciaEn: string;

  @IsOptional()
  @IsDateString()
  venceEn?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'vencida', 'suspendida', 'cancelada'])
  estado?: string;
}
