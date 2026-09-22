import { IsIn, IsOptional } from 'class-validator';

export class UpdateEvidenciaDto {
  @IsOptional()
  @IsIn(['fotografia', 'documento', 'firma', 'archivo', 'audio', 'video'])
  tipoEvidencia?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}
