import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';
export class CreateAsignacionesLineaPersonaDto {
  @IsUUID() lineaTelefonicaId: string;
  @IsOptional() @IsUUID() personaId?: string;
  @IsOptional() @IsUUID() departamentoId?: string;
  @IsDateString() iniciaEn: string;
  @IsOptional() @IsDateString() terminaEn?: string;
  @IsOptional() @IsIn(['activa', 'finalizada', 'cancelada']) estado?: string;
  @IsOptional() @IsString() @Length(0, 1000) motivo?: string;
}
