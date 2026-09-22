import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class UpdateConfiguracionOperativaTenantDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  remitenteNombre?: string;

  @IsOptional()
  @IsEmail()
  @Length(5, 180)
  remitenteCorreo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  smtpHost?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPuerto?: number;

  @IsOptional()
  @IsString()
  @Length(1, 180)
  smtpUsuario?: string;

  @IsOptional()
  @IsString()
  @Length(4, 300)
  smtpContrasena?: string;

  @IsOptional()
  @IsBoolean()
  resetSmtpContrasena?: boolean;

  @IsOptional()
  @IsBoolean()
  smtpTls?: boolean;

  @IsOptional()
  @IsIn(['smtp', 'resend', 'sendgrid_api', 'custom_api'])
  correoProveedor?: 'smtp' | 'resend' | 'sendgrid_api' | 'custom_api';

  @IsOptional()
  @IsString()
  @Length(5, 600)
  correoApiEndpoint?: string;

  @IsOptional()
  @IsString()
  @Length(2, 80)
  correoApiAuthHeader?: string;

  @IsOptional()
  @IsString()
  @Length(0, 40)
  correoApiAuthPrefix?: string;

  @IsOptional()
  @IsString()
  @Length(4, 300)
  correoApiKey?: string;

  @IsOptional()
  @IsBoolean()
  resetCorreoApiKey?: boolean;

  @IsOptional()
  @IsIn(['local', 'nube'])
  almacenamientoModo?: 'local' | 'nube';

  @IsOptional()
  @IsString()
  @Length(3, 300)
  almacenamientoRutaLocal?: string;

  @IsOptional()
  @IsIn(['s3', 'azure_blob', 'gcs', 'minio', 'compatible'])
  almacenamientoNubeProveedor?:
    | 's3'
    | 'azure_blob'
    | 'gcs'
    | 'minio'
    | 'compatible';

  @IsOptional()
  @IsString()
  @Length(3, 180)
  almacenamientoNubeRepositorio?: string;

  @IsOptional()
  @IsBoolean()
  autoProvisionRepositorioNube?: boolean;

  @IsOptional()
  @IsString()
  @Length(4, 400)
  almacenamientoNubeEndpoint?: string;

  @IsOptional()
  @IsString()
  @Length(2, 180)
  almacenamientoNubeAccessKey?: string;

  @IsOptional()
  @IsString()
  @Length(4, 300)
  almacenamientoNubeSecret?: string;

  @IsOptional()
  @IsBoolean()
  resetAlmacenamientoNubeSecret?: boolean;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  almacenamientoNubeRegion?: string;

  @IsOptional()
  @IsBoolean()
  almacenamientoNubeSsl?: boolean;

  @IsOptional()
  @IsString()
  @Length(1, 2000)
  notasOperativas?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  cloudTenantId?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  cloudApiUrl?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  cloudApiKey?: string;

  @IsOptional()
  @IsString()
  @Length(1, 255)
  cloudLicensePath?: string;

  @IsOptional()
  @IsBoolean()
  oidcMicrosoftHabilitado?: boolean;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcMicrosoftIssuer?: string;

  @IsOptional()
  @IsString()
  @Length(3, 300)
  oidcMicrosoftAudience?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcMicrosoftJwksUri?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcMicrosoftMetadataUrl?: string;

  @IsOptional()
  @IsString()
  @Length(2, 255)
  oidcMicrosoftTenantId?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  oidcMicrosoftClientId?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcMicrosoftClientSecret?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcMicrosoftRedirectUri?: string;

  @IsOptional()
  @IsBoolean()
  oidcGoogleHabilitado?: boolean;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcGoogleIssuer?: string;

  @IsOptional()
  @IsString()
  @Length(3, 300)
  oidcGoogleAudience?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcGoogleJwksUri?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcGoogleMetadataUrl?: string;

  @IsOptional()
  @IsString()
  @Length(3, 255)
  oidcGoogleClientId?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcGoogleClientSecret?: string;

  @IsOptional()
  @IsString()
  @Length(8, 600)
  oidcGoogleRedirectUri?: string;
}
