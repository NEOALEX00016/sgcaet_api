import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateAsignacionRecursoDto {
  @IsUUID()
  asignacionId: string;

  @IsIn(['activo', 'linea'])
  tipoRecurso: string;

  @IsOptional()
  @IsUUID()
  activoId?: string;

  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
