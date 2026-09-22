import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CreateRolPermisoDto {
  @IsUUID()
  rolId: string;

  @IsUUID()
  permisoId: string;

  @IsOptional()
  @IsUUID()
  otorgadoPor?: string;

  @IsOptional()
  @IsDateString()
  otorgadoEn?: string;
}
