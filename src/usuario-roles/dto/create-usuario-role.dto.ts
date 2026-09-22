import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateUsuarioRoleDto {
  @IsUUID()
  usuarioId: string;

  @IsUUID()
  rolId: string;

  @IsOptional()
  @IsUUID()
  asignadoPor?: string;

  @IsOptional()
  @IsDateString()
  asignadoEn?: string;
}
