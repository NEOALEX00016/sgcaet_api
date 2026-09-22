import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
export class CreateEjecucionesCargaEmpleadoDto {
  @IsOptional() @IsUUID() fuenteEmpleadosId?: string;
  @IsIn(['inicial', 'incremental', 'manual']) tipoCarga: string;
  @IsOptional()
  @IsIn(['en_proceso', 'completada', 'fallida', 'cancelada'])
  estado?: string;
  @IsOptional() @IsInt() @Min(0) totalRegistros?: number;
  @IsOptional() @IsInt() @Min(0) creados?: number;
  @IsOptional() @IsInt() @Min(0) actualizados?: number;
  @IsOptional() @IsInt() @Min(0) sinCambios?: number;
  @IsOptional() @IsInt() @Min(0) errores?: number;
  @IsOptional() @IsString() detalleError?: string;
  @IsOptional() finalizadaEn?: string;
}
