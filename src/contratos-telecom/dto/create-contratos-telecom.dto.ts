import { IsDateString, IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';
export class CreateContratosTelecomDto {
  @IsUUID() operadoraId: string;
  @IsString() @Length(2, 80) codigo: string;
  @IsString() @Length(2, 160) nombre: string;
  @IsOptional() @IsString() @Length(2, 120) numeroContrato?: string;
  @IsDateString() iniciaEn: string;
  @IsOptional() @IsDateString() terminaEn?: string;
  @IsOptional() @IsInt() @Min(1) @Max(28) diaRenovacion?: number;
  @IsOptional() @IsIn(['borrador', 'activo', 'suspendido', 'finalizado']) estado?: string;
  @IsOptional() @IsString() @Length(0, 2000) observaciones?: string;
}
