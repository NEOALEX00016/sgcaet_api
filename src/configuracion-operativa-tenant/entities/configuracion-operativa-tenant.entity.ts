import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('configuracion_operativa_tenant')
export class ConfiguracionOperativaTenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'empresa_id', type: 'uuid', unique: true })
  empresaId: string;

  @Column({ name: 'remitente_nombre', length: 120, default: 'SGCAET' })
  remitenteNombre: string;

  @Column({ name: 'remitente_correo', length: 180 })
  remitenteCorreo: string;

  @Column({ name: 'smtp_host', length: 180, nullable: true })
  smtpHost?: string;

  @Column({ name: 'smtp_puerto', type: 'integer', nullable: true })
  smtpPuerto?: number;

  @Column({ name: 'smtp_usuario', length: 180, nullable: true })
  smtpUsuario?: string;

  @Column({
    name: 'smtp_contrasena_cifrada',
    type: 'text',
    nullable: true,
    select: false,
  })
  smtpContrasenaCifrada?: string;

  @Column({ name: 'smtp_tls', default: true })
  smtpTls: boolean;

  @Column({ name: 'correo_proveedor', length: 20, default: 'smtp' })
  correoProveedor: 'smtp' | 'resend' | 'sendgrid_api' | 'custom_api';

  @Column({ name: 'correo_api_endpoint', type: 'text', nullable: true })
  correoApiEndpoint?: string;

  @Column({ name: 'correo_api_auth_header', length: 80, nullable: true })
  correoApiAuthHeader?: string;

  @Column({ name: 'correo_api_auth_prefix', length: 40, nullable: true })
  correoApiAuthPrefix?: string;

  @Column({ name: 'correo_api_key_cifrada', type: 'text', nullable: true, select: false })
  correoApiKeyCifrada?: string;

  @Column({ name: 'correo_ultima_prueba_at', type: 'timestamp', nullable: true })
  correoUltimaPruebaAt?: Date;

  @Column({ name: 'correo_ultima_prueba_estado', length: 20, nullable: true })
  correoUltimaPruebaEstado?: 'ok' | 'error';

  @Column({ name: 'correo_ultima_prueba_detalle', type: 'text', nullable: true })
  correoUltimaPruebaDetalle?: string;

  @Column({ name: 'correo_ultima_prueba_actor_id', type: 'uuid', nullable: true })
  correoUltimaPruebaActorId?: string;

  @Column({ name: 'almacenamiento_modo', length: 20, default: 'local' })
  almacenamientoModo: 'local' | 'nube';

  @Column({ name: 'almacenamiento_ruta_local', type: 'text', nullable: true })
  almacenamientoRutaLocal?: string;

  @Column({ name: 'almacenamiento_nube_proveedor', length: 20, nullable: true })
  almacenamientoNubeProveedor?:
    | 's3'
    | 'azure_blob'
    | 'gcs'
    | 'minio'
    | 'compatible';

  @Column({
    name: 'almacenamiento_nube_repositorio',
    length: 180,
    nullable: true,
  })
  almacenamientoNubeRepositorio?: string;

  @Column({ name: 'auto_provision_repositorio_nube', default: false })
  autoProvisionRepositorioNube: boolean;

  @Column({ name: 'almacenamiento_nube_endpoint', type: 'text', nullable: true })
  almacenamientoNubeEndpoint?: string;

  @Column({
    name: 'almacenamiento_nube_access_key',
    length: 180,
    nullable: true,
  })
  almacenamientoNubeAccessKey?: string;

  @Column({
    name: 'almacenamiento_nube_secret_cifrada',
    type: 'text',
    nullable: true,
    select: false,
  })
  almacenamientoNubeSecretCifrada?: string;

  @Column({ name: 'almacenamiento_nube_region', length: 120, nullable: true })
  almacenamientoNubeRegion?: string;

  @Column({ name: 'almacenamiento_nube_ssl', default: true })
  almacenamientoNubeSsl: boolean;

  @Column({ name: 'notas_operativas', type: 'text', nullable: true })
  notasOperativas?: string;

  @Column({ name: 'cloud_tenant_id', length: 255, nullable: true })
  cloudTenantId?: string;

  @Column({ name: 'cloud_api_url', type: 'text', nullable: true })
  cloudApiUrl?: string;

  @Column({ name: 'cloud_api_key_cifrada', type: 'text', nullable: true, select: false })
  cloudApiKeyCifrada?: string;

  @Column({ name: 'cloud_license_path', type: 'text', nullable: true })
  cloudLicensePath?: string;

  @Column({ name: 'cloud_ultima_validacion_at', type: 'timestamp', nullable: true })
  cloudUltimaValidacionAt?: Date;

  @Column({ name: 'cloud_ultima_validacion_estado', length: 20, nullable: true })
  cloudUltimaValidacionEstado?: 'ok' | 'error';

  @Column({ name: 'cloud_ultima_validacion_detalle', type: 'text', nullable: true })
  cloudUltimaValidacionDetalle?: string;

  @Column({ name: 'cloud_licencia_tipo', length: 20, nullable: true })
  cloudLicenciaTipo?: string;

  @Column({ name: 'cloud_licencia_estado', length: 20, nullable: true })
  cloudLicenciaEstado?: string;

  @Column({ name: 'cloud_licencia_vence_en', type: 'timestamptz', nullable: true })
  cloudLicenciaVenceEn?: Date;

  @Column({ name: 'cloud_licencia_es_perpetua', default: false })
  cloudLicenciaEsPerpetua: boolean;

  @Column({ name: 'oidc_microsoft_habilitado', default: false })
  oidcMicrosoftHabilitado: boolean;

  @Column({ name: 'oidc_microsoft_issuer', type: 'text', nullable: true })
  oidcMicrosoftIssuer?: string;

  @Column({ name: 'oidc_microsoft_audience', type: 'text', nullable: true })
  oidcMicrosoftAudience?: string;

  @Column({ name: 'oidc_microsoft_jwks_uri', type: 'text', nullable: true })
  oidcMicrosoftJwksUri?: string;

  @Column({ name: 'oidc_microsoft_metadata_url', type: 'text', nullable: true })
  oidcMicrosoftMetadataUrl?: string;

  @Column({ name: 'oidc_microsoft_tenant_id', length: 255, nullable: true })
  oidcMicrosoftTenantId?: string;
  @Column({ name: 'oidc_microsoft_client_id', length: 255, nullable: true })
  oidcMicrosoftClientId?: string;
  @Column({ name: 'oidc_microsoft_client_secret_cifrada', type: 'text', nullable: true, select: false })
  oidcMicrosoftClientSecretCifrada?: string;
  @Column({ name: 'oidc_microsoft_redirect_uri', type: 'text', nullable: true })
  oidcMicrosoftRedirectUri?: string;

  @Column({ name: 'oidc_google_habilitado', default: false })
  oidcGoogleHabilitado: boolean;

  @Column({ name: 'oidc_google_issuer', type: 'text', nullable: true })
  oidcGoogleIssuer?: string;

  @Column({ name: 'oidc_google_audience', type: 'text', nullable: true })
  oidcGoogleAudience?: string;

  @Column({ name: 'oidc_google_jwks_uri', type: 'text', nullable: true })
  oidcGoogleJwksUri?: string;

  @Column({ name: 'oidc_google_metadata_url', type: 'text', nullable: true })
  oidcGoogleMetadataUrl?: string;
  @Column({ name: 'oidc_google_client_id', length: 255, nullable: true })
  oidcGoogleClientId?: string;
  @Column({ name: 'oidc_google_client_secret_cifrada', type: 'text', nullable: true, select: false })
  oidcGoogleClientSecretCifrada?: string;
  @Column({ name: 'oidc_google_redirect_uri', type: 'text', nullable: true })
  oidcGoogleRedirectUri?: string;

  @Column({ name: 'almacenamiento_ultima_prueba_at', type: 'timestamp', nullable: true })
  almacenamientoUltimaPruebaAt?: Date;

  @Column({ name: 'almacenamiento_ultima_prueba_estado', length: 20, nullable: true })
  almacenamientoUltimaPruebaEstado?: 'ok' | 'error';

  @Column({ name: 'almacenamiento_ultima_prueba_detalle', type: 'text', nullable: true })
  almacenamientoUltimaPruebaDetalle?: string;

  @Column({ name: 'almacenamiento_ultima_prueba_actor_id', type: 'uuid', nullable: true })
  almacenamientoUltimaPruebaActorId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
