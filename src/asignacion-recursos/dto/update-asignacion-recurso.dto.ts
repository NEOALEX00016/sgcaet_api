import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class UpdateAsignacionRecursoDto {
  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
