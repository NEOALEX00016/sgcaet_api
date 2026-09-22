import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfiguracionOperativaTenant } from '../configuracion-operativa-tenant/entities/configuracion-operativa-tenant.entity';

export type OidcProvider = 'microsoft' | 'google';

export type OidcProviderConfig = {
  provider: OidcProvider;
  enabled: boolean;
  issuer?: string;
  audience?: string;
  jwksUri?: string;
  metadataUrl?: string;
  tenantId?: string;
};

@Injectable()
export class OidcConfigService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(ConfiguracionOperativaTenant)
    private readonly configuracionOperativaTenantRepository: Repository<ConfiguracionOperativaTenant>,
  ) {}

  async getProviderConfig(
    provider: OidcProvider,
    empresaId?: string,
  ): Promise<OidcProviderConfig> {
    if (empresaId) {
      const tenantConfig = await this.getTenantProviderConfig(provider, empresaId);
      if (tenantConfig) {
        return tenantConfig;
      }
    }

    const prefix = provider === 'microsoft' ? 'OIDC_MS' : 'OIDC_GOOGLE';
    const issuer = this.read(`${prefix}_ISSUER`);
    const audience = this.read(`${prefix}_AUDIENCE`);
    const jwksUri = this.read(`${prefix}_JWKS_URI`);
    const metadataUrl = this.read(`${prefix}_METADATA_URL`);
    const tenantId = this.read(`${prefix}_TENANT_ID`);

    const enabled = Boolean(issuer && audience && (jwksUri || metadataUrl));

    return {
      provider,
      enabled,
      issuer: issuer ?? undefined,
      audience: audience ?? undefined,
      jwksUri: jwksUri ?? undefined,
      metadataUrl: metadataUrl ?? undefined,
      tenantId: tenantId ?? undefined,
    };
  }

  async ensureProviderEnabled(
    provider: OidcProvider,
    empresaId?: string,
  ): Promise<OidcProviderConfig> {
    const config = await this.getProviderConfig(provider, empresaId);
    if (!config.enabled) {
      throw new ServiceUnavailableException(
        empresaId
          ? `OIDC ${provider} no esta configurado para el tenant`
          : `OIDC ${provider} no esta configurado en este entorno`,
      );
    }
    return config;
  }

  private async getTenantProviderConfig(
    provider: OidcProvider,
    empresaId: string,
  ): Promise<OidcProviderConfig | null> {
    const tenantConfig = await this.configuracionOperativaTenantRepository.findOne({
      where: { empresaId },
    });

    if (!tenantConfig) {
      return null;
    }

    if (provider === 'microsoft') {
      const hasTenantValues = Boolean(
        tenantConfig.oidcMicrosoftIssuer ||
          tenantConfig.oidcMicrosoftAudience ||
          tenantConfig.oidcMicrosoftJwksUri ||
          tenantConfig.oidcMicrosoftMetadataUrl ||
          tenantConfig.oidcMicrosoftTenantId ||
          tenantConfig.oidcMicrosoftHabilitado,
      );

      if (!hasTenantValues) {
        return null;
      }

      const issuer = this.normalize(tenantConfig.oidcMicrosoftIssuer);
      const audience = this.normalize(tenantConfig.oidcMicrosoftAudience);
      const jwksUri = this.normalize(tenantConfig.oidcMicrosoftJwksUri);
      const metadataUrl = this.normalize(tenantConfig.oidcMicrosoftMetadataUrl);
      const tenantId = this.normalize(tenantConfig.oidcMicrosoftTenantId);
      const enabled = Boolean(
        tenantConfig.oidcMicrosoftHabilitado &&
          issuer &&
          audience &&
          (jwksUri || metadataUrl),
      );

      return {
        provider,
        enabled,
        issuer: issuer ?? undefined,
        audience: audience ?? undefined,
        jwksUri: jwksUri ?? undefined,
        metadataUrl: metadataUrl ?? undefined,
        tenantId: tenantId ?? undefined,
      };
    }

    const hasTenantValues = Boolean(
      tenantConfig.oidcGoogleIssuer ||
        tenantConfig.oidcGoogleAudience ||
        tenantConfig.oidcGoogleJwksUri ||
        tenantConfig.oidcGoogleMetadataUrl ||
        tenantConfig.oidcGoogleHabilitado,
    );

    if (!hasTenantValues) {
      return null;
    }

    const issuer = this.normalize(tenantConfig.oidcGoogleIssuer);
    const audience = this.normalize(tenantConfig.oidcGoogleAudience);
    const jwksUri = this.normalize(tenantConfig.oidcGoogleJwksUri);
    const metadataUrl = this.normalize(tenantConfig.oidcGoogleMetadataUrl);
    const enabled = Boolean(
      tenantConfig.oidcGoogleHabilitado &&
        issuer &&
        audience &&
        (jwksUri || metadataUrl),
    );

    return {
      provider,
      enabled,
      issuer: issuer ?? undefined,
      audience: audience ?? undefined,
      jwksUri: jwksUri ?? undefined,
      metadataUrl: metadataUrl ?? undefined,
    };
  }

  private read(key: string): string | null {
    const value = this.configService.get<string>(key);
    return this.normalize(value);
  }

  private normalize(value?: string | null): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
