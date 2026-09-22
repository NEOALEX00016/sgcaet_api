import { IsIn, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateFormularioReglaDto {
  @IsUUID()
  formularioVersionId: string;

  @IsUUID()
  campoOrigenId: string;

  @IsString()
  @Length(1, 30)
  operador: string;

  @IsOptional()
  @IsString()
  valorEsperado?: string;

  @IsString()
  @IsIn(['mostrar', 'ocultar', 'requerir', 'deshabilitar'])
  accion: string;

  @IsUUID()
  campoDestinoId: string;

  // Accepted for request compatibility; authorization always uses the JWT claims.
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  usuarioActorId?: string;
}
