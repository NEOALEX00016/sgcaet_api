import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class CreatePoliticasFormularioAsignacionDto {
  @IsUUID()
  tipoAsignacionId: string;

  @IsOptional()
  @IsUUID()
  dominioId?: string;

  @IsOptional()
  @IsUUID()
  categoriaId?: string;

  @IsUUID()
  formularioId: string;

  @IsOptional()
  @IsBoolean()
  estaActiva?: boolean;
}
