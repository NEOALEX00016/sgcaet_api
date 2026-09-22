import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
export class CreateEventosLicenciaEmpresaDto {
  [key: string]: unknown;
  @IsUUID() licenciaEmpresaId: string;
  @IsIn([
    'creada',
    'renovada',
    'extendida',
    'suspendida',
    'reactivada',
    'vencida',
    'cancelada',
  ])
  tipoEvento: string;
  @IsOptional() @IsString() motivoEvento?: string;
  @IsOptional() payloadEvento?: Record<string, unknown>;
}
