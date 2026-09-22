import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateEvidenciaDto {
  @IsString()
  @Length(2, 50)
  entidadRelacionada: string;

  @IsUUID()
  entidadRelacionadaId: string;

  @IsString()
  @IsIn(['fotografia', 'documento', 'firma', 'archivo', 'audio', 'video'])
  tipoEvidencia: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
