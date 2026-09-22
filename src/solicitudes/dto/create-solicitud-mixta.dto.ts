import { IsDateString, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateSolicitudMixtaDto {
  @IsOptional() @IsUUID() personaId?: string;
  @IsOptional() @IsString() @Length(2, 2000) motivo?: string;
  @IsOptional() @IsDateString() desdeEn?: string;
  @IsOptional() @IsDateString() hastaEn?: string;
  @IsString() @Length(1, 80) equipoRecursoTipo: string;
  @IsOptional() @IsUUID() equipoRecursoId?: string;
  @IsString() @Length(1, 80) telecomRecursoTipo: string;
  @IsOptional() @IsUUID() telecomRecursoId?: string;
}
