import { ServiceUnavailableException } from '@nestjs/common';
import { OidcConfigService } from './oidc-config.service';

describe('OidcConfigService', () => {
  const tenantConfigRepository = {
    findOne: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    tenantConfigRepository.findOne.mockResolvedValue(null);
  });

  it('reports provider disabled without env vars', async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) } as any;
    const service = new OidcConfigService(configService, tenantConfigRepository);

    const microsoft = await service.getProviderConfig('microsoft');
    expect(microsoft.enabled).toBe(false);
  });

  it('reports provider enabled when issuer audience and jwks are configured', async () => {
    const values: Record<string, string> = {
      OIDC_MS_ISSUER: 'https://issuer.test',
      OIDC_MS_AUDIENCE: 'api://sgcaet',
      OIDC_MS_JWKS_URI: 'https://issuer.test/jwks',
    };
    const configService = {
      get: jest.fn((key: string) => values[key]),
    } as any;
    const service = new OidcConfigService(configService, tenantConfigRepository);

    const microsoft = await service.getProviderConfig('microsoft');
    expect(microsoft.enabled).toBe(true);
    expect(microsoft.issuer).toBe('https://issuer.test');
  });

  it('uses tenant OIDC config when tenant has provider configured', async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) } as any;
    tenantConfigRepository.findOne.mockResolvedValue({
      empresaId: 'empresa-1',
      oidcMicrosoftHabilitado: true,
      oidcMicrosoftIssuer: 'https://tenant-issuer.test',
      oidcMicrosoftAudience: 'tenant-audience',
      oidcMicrosoftJwksUri: 'https://tenant-issuer.test/jwks',
      oidcMicrosoftMetadataUrl: null,
      oidcMicrosoftTenantId: 'tenant-id',
    });
    const service = new OidcConfigService(configService, tenantConfigRepository);

    const microsoft = await service.getProviderConfig('microsoft', 'empresa-1');
    expect(microsoft.enabled).toBe(true);
    expect(microsoft.issuer).toBe('https://tenant-issuer.test');
  });

  it('throws when provider is required but disabled', async () => {
    const configService = { get: jest.fn().mockReturnValue(undefined) } as any;
    const service = new OidcConfigService(configService, tenantConfigRepository);

    await expect(service.ensureProviderEnabled('google')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
