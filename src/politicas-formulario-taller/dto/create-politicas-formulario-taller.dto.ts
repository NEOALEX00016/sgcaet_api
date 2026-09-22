import { IsBoolean, IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreatePoliticasFormularioTallerDto {
  @IsIn(['reparacion', 'mantenimiento']) tipoServicio: string;
  @IsIn(['entrada', 'salida']) etapa: string;
  @IsOptional() @IsUUID() categoriaEquipoId?: string;
  @IsOptional() @IsUUID() tipoActivoId?: string;
  @IsUUID() formularioId: string;
  @IsOptional() @IsBoolean() esObligatoria?: boolean;
  @IsOptional() @IsBoolean() estaActiva?: boolean;
}
