import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService OIDC login', () => {
  const usuariosRepository = {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
  } as any;
  const dominiosRepository = { findOne: jest.fn() } as any;
  const empresasRepository = { findOne: jest.fn() } as any;
  const usuarioRolesRepository = { find: jest.fn() } as any;
  const rolPermisosRepository = { find: jest.fn() } as any;
  const permisosRepository = { find: jest.fn() } as any;
  const usuarioIdentidadesRepository = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn(),
  } as any;
  const oidcConfigService = {
    ensureProviderEnabled: jest.fn(),
    getProviderConfig: jest.fn(),
  } as any;
  const jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') } as any;

  const service = new AuthService(
    usuariosRepository,
    dominiosRepository,
    empresasRepository,
    usuarioRolesRepository,
    rolPermisosRepository,
    permisosRepository,
    usuarioIdentidadesRepository,
    oidcConfigService,
    jwtService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('vincula identidad externa por correo+tenant y retorna JWT', async () => {
    oidcConfigService.ensureProviderEnabled.mockReturnValue({ enabled: true });
    usuariosRepository.findOne.mockResolvedValue({
      id: 'user-1',
      empresaId: 'empresa-1',
      correo: 'owner@test.com',
    });
    usuarioIdentidadesRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    const result = await service.loginWithOidc({
      proveedor: 'microsoft',
      subjectExterno: 'subject-1',
      correo: 'owner@test.com',
      empresaId: 'empresa-1',
    });

    expect(oidcConfigService.ensureProviderEnabled).toHaveBeenCalledWith(
      'microsoft',
      'empresa-1',
    );
    expect(usuarioIdentidadesRepository.save).toHaveBeenCalled();
    expect(result.accessToken).toBe('jwt-token');
  });

  it('rechaza si el subject externo ya pertenece a otro usuario del tenant', async () => {
    oidcConfigService.ensureProviderEnabled.mockReturnValue({ enabled: true });
    usuariosRepository.findOne.mockResolvedValue({
      id: 'user-1',
      empresaId: 'empresa-1',
      correo: 'owner@test.com',
    });
    usuarioIdentidadesRepository.findOne.mockResolvedValueOnce({
      usuarioId: 'otro-usuario',
    });

    await expect(
      service.loginWithOidc({
        proveedor: 'google',
        subjectExterno: 'subject-1',
        correo: 'owner@test.com',
        empresaId: 'empresa-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('resuelve tenant por dominio de correo cuando no se envia empresaId', async () => {
    oidcConfigService.ensureProviderEnabled.mockReturnValue({ enabled: true });
    dominiosRepository.findOne.mockResolvedValue({ empresaId: 'empresa-dominio' });
    usuariosRepository.findOne.mockResolvedValue({
      id: 'user-1',
      empresaId: 'empresa-dominio',
      correo: 'owner@tenant.test',
    });
    usuarioIdentidadesRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);

    await service.loginWithOidc({
      proveedor: 'microsoft',
      subjectExterno: 'subject-domain',
      correo: 'owner@tenant.test',
    });

    expect(dominiosRepository.findOne).toHaveBeenCalled();
  });
});
