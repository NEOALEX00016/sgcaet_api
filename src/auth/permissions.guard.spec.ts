import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const usuarioRolesRepository = { find: jest.fn() };
  const rolPermisosRepository = { find: jest.fn() };
  const permisosRepository = { findOne: jest.fn() };
  const usuariosRepository = { findOne: jest.fn() };
  const guard = new PermissionsGuard(
    reflector,
    usuarioRolesRepository as never,
    rolPermisosRepository as never,
    permisosRepository as never,
    usuariosRepository as never,
  );

  const context = (user?: { userId: string; empresaId: string }) =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('plataforma.empresas.gestionar');
  });

  it('rejects a request without an authenticated user', async () => {
    await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects an authenticated user without the required permission', async () => {
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-other' },
    ]);
    permisosRepository.findOne.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a platform owner to use platform permissions', async () => {
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: true,
    });

    await expect(
      guard.canActivate(context({ userId: 'owner-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);
    expect(usuarioRolesRepository.find).not.toHaveBeenCalled();
  });

  it('accepts alias permissions for solicitudes.ver', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue('solicitudes.ver');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'solicitudes.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain('solicitudes.ver');
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'solicitudes.gestionar',
    );
  });

  it('accepts alias permissions for solicitudes.configurar', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('solicitudes.configurar');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'solicitudes.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain('solicitudes.configurar');
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'solicitudes.gestionar',
    );
  });

  it('accepts alias permissions for fuentes-empleados.ver', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('fuentes-empleados.ver');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'personas.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'fuentes-empleados.ver',
    );
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.gestionar',
    );
  });

  it('accepts alias permissions for fuentes-empleados.crear', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('fuentes-empleados.crear');
    usuariosRepository.findOne.mockResolvedValue({ esPropietarioPlataforma: false });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'personas.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);
  });

  it('accepts alias permissions for personas.ejecuciones-carga.ver', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('personas.ejecuciones-carga.ver');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'personas.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.ejecuciones-carga.ver',
    );
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.gestionar',
    );
  });

  it('accepts alias permissions for estructura.nodos.crear', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('estructura.nodos.crear');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'personas.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'estructura.nodos.crear',
    );
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.gestionar',
    );
  });

  it('accepts alias permissions for estructura.nodos.ver', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue('estructura.nodos.ver');
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'personas.gestionar' });

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.findOne.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'estructura.nodos.ver',
    );
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.gestionar',
    );
  });
});
