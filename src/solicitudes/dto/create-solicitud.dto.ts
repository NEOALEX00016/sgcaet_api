import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateSolicitudDto {
  @IsOptional() @IsUUID() personaId?: string;
  @IsString() @IsIn(['activo', 'telecom']) tipoSolicitud: string;
  @IsOptional() @IsString() @IsIn(['equipos', 'telecom']) dominio?: string;
  @IsOptional() @IsUUID() grupoId?: string;
  @IsOptional() @IsUUID() solicitudPadreId?: string;
  @IsString()
  @IsIn([
    'laptop',
    'monitor',
    'proyector',
    'prestamo_actividad',
    'prestamo_permanente',
    'reparacion_activo',
    'paquete_datos',
    'recarga_minutos',
    'sms',
    'telecom',
  ])
  recursoTipo: string;
  @IsOptional() @IsUUID() recursoId?: string;
  @IsOptional() @IsNumberString() cantidad?: string;
  @IsOptional() @IsString() @Length(1, 20) unidad?: string;
  @IsOptional() @IsDateString() desdeEn?: string;
  @IsOptional() @IsDateString() hastaEn?: string;
  @IsOptional() @IsString() @Length(2, 2000) motivo?: string;
  @IsOptional() @IsString() @IsIn(['portal', 'externa']) origen?: string;
  @IsOptional()
  @IsString()
  @IsIn(['portal', 'telefono', 'correo', 'whatsapp', 'presencial', 'mesa_ayuda', 'otro'])
  canalEntrada?: string;
  @IsOptional() @IsString() @Length(2, 160) referenciaExterna?: string;
}
