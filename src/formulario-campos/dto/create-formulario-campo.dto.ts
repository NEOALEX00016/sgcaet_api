import {
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Min,
} from 'class-validator';

export class CreateFormularioCampoDto {
  @IsUUID()
  formularioVersionId: string;

  @IsString()
  @Length(1, 80)
  clave: string;

  @IsString()
  @Length(1, 160)
  etiqueta: string;

  @IsString()
  @IsIn([
    'text',
    'textarea',
    'number',
    'date',
    'datetime',
    'select',
    'multiselect',
    'checkbox',
    'radio',
    'file',
    'image',
    'signature',
    'table',
    'label',
    'separator',
  ])
  tipoCampo: string;

  @IsInt()
  @Min(0)
  orden: number;

  @IsOptional()
  @IsBoolean()
  requerido?: boolean;

  @IsOptional()
  @IsObject()
  configuracion?: Record<string, unknown>;

  // Accepted for request compatibility; authorization always uses the JWT claims.
  @IsOptional()
  @IsUUID()
  empresaId?: string;

  @IsOptional()
  @IsUUID()
  usuarioActorId?: string;
}
