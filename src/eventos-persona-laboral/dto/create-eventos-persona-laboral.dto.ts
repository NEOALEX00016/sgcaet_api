import {
  IsIn,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
export class CreateEventosPersonaLaboralDto {
  @IsUUID() personaId: string;
  @IsOptional() @IsUUID() fuenteEmpleadosId?: string;
  @IsIn([
    'alta_detectada',
    'cambio_detectado',
    'salida_detectada',
    'reactivacion_detectada',
  ])
  tipoEvento: string;
  @IsOptional() @IsString() estadoAnterior?: string;
  @IsString() estadoNuevo: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @IsOptional() @IsISO8601() detectadoEn?: string;
}
