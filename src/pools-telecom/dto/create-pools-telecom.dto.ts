import { IsBoolean, IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
export class CreatePoolsTelecomDto {
  @IsUUID() contratoTelecomId: string;
  @IsUUID() operadoraId: string;
  @IsString() @Length(2, 80) codigo: string;
  @IsString() @Length(2, 160) nombre: string;
  @IsDateString() iniciaEn: string;
  @IsOptional() @IsDateString() terminaEn?: string;
  @IsOptional() @IsInt() @Min(1) @Max(28) diaRenovacion?: number;
  @IsOptional() @IsBoolean() heredaDiaRenovacion?: boolean;
  @IsOptional() @IsString() @Length(0, 60) zonaHoraria?: string;
  @IsOptional() @IsIn(['borrador', 'activo', 'suspendido', 'finalizado']) estado?: string;
  @IsOptional() @IsString() @Length(0, 2000) observaciones?: string;
}
