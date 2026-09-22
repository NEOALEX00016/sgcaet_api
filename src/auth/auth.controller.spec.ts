import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController OIDC endpoints', () => {
  let controller: AuthController;
  const authServiceMock = {
    login: jest.fn(),
    loginWithOidc: jest.fn(),
    getCurrentUser: jest.fn(),
    getOidcProviderStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authServiceMock }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    jest.clearAllMocks();
  });

  it('delegates login/oidc to service', async () => {
    authServiceMock.loginWithOidc.mockResolvedValue({ accessToken: 't' });
    await controller.loginWithOidc({
      proveedor: 'microsoft',
      subjectExterno: 'subject-1',
      correo: 'owner@test.com',
    } as any);

    expect(authServiceMock.loginWithOidc).toHaveBeenCalled();
  });

  it('returns provider status for auth/oidc/providers', async () => {
    authServiceMock.getOidcProviderStatus.mockResolvedValue({
      microsoft: { enabled: false },
      google: { enabled: false },
    });

    const result = await controller.oidcProviders({
      userId: 'u-1',
      empresaId: 'e-1',
      correo: 'owner@test.com',
    });

    expect(result.microsoft.enabled).toBe(false);
    expect(authServiceMock.getOidcProviderStatus).toHaveBeenCalledWith('e-1');
  });
});
