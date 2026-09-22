import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateAsignacionBolsaTelecomDto {
  @IsUUID()
  bolsaTelecomId: string;

  @IsOptional()
  @IsUUID()
  personaId?: string;

  @IsOptional()
  @IsUUID()
  departamentoId?: string;

  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsNumberString()
  cantidad: string;

  @IsString()
  @Length(2, 20)
  unidad: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'consumida', 'cancelada', 'vencida'])
  estado?: string;
}
