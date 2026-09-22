import { IsDateString, IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class ConvertirASolicitudReparacionDto {
  @IsOptional()
  @IsUUID()
  activoId: string;

  @IsOptional()
  @IsString()
  @IsIn(['reparacion', 'mantenimiento'])
  tipoServicio?: string;

  @IsOptional()
  @IsString()
  @Length(3, 4000)
  diagnostico: string;

  @IsOptional()
  @IsDateString()
  fechaIngreso?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;
}
