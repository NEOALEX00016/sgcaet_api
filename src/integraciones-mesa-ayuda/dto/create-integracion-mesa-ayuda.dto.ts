import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Length,
} from 'class-validator';

export class CreateIntegracionMesaAyudaDto {
  @IsString()
  @Length(1, 140)
  nombre: string;

  @IsIn(['api', 'email'])
  tipo: 'api' | 'email';

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsUrl({ require_tld: false })
  baseUrl?: string;

  @IsOptional()
  @IsString()
  endpointSolicitud?: string;

  @IsOptional()
  @IsString()
  @Length(3, 180)
  emailDestino?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  authTipo?: string;

  @IsOptional()
  @IsObject()
  headersJson?: Record<string, string>;
}
