import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
  const usuarioRolesRepository = { find: jest.fn() };
  const rolPermisosRepository = { find: jest.fn() };
  const permisosRepository = { find: jest.fn() };
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
    permisosRepository.find.mockResolvedValue([]);

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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'solicitudes.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'solicitudes.ver',
    );
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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'solicitudes.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'solicitudes.configurar',
    );
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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'personas.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
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
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'personas.gestionar',
      },
    ]);

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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'personas.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'personas.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
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
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-1' },
    ]);
    permisosRepository.find.mockResolvedValue([
      {
        codigo: 'personas.gestionar',
      },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);

    const findOneArg = permisosRepository.find.mock.calls[0][0] as {
      where: { codigo: unknown };
    };
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'estructura.nodos.ver',
    );
    expect(JSON.stringify(findOneArg.where.codigo)).toContain(
      'personas.gestionar',
    );
  });

  it.each([
    'reparaciones.ver',
    'reparaciones.crear',
    'reparaciones.diagnosticar',
    'reparaciones.editar',
    'reparaciones.comunicar',
    'reparaciones.estado',
    'reparaciones.resolver',
    'reparaciones.cancelar',
    'reparaciones.costos.gestionar',
    'reparaciones.documentos.gestionar',
    'reparaciones.reportes.ver',
    'repuestos.ver',
    'repuestos.catalogo.gestionar',
    'repuestos.existencias.gestionar',
    'repuestos.movimientos.ver',
    'componentes_instalados.ver',
    'componentes_instalados.gestionar',
    'reparaciones.formularios.ver',
    'reparaciones.formularios.gestionar',
    'reparaciones.formularios.responder',
    'mantenimiento.preventivo.ver',
    'mantenimiento.preventivo.gestionar',
  ])(
    'accepts reparaciones.gestionar as temporary alias for %s',
    async (required) => {
      reflector.getAllAndOverride = jest.fn().mockReturnValue(required);
      usuariosRepository.findOne.mockResolvedValue({
        esPropietarioPlataforma: false,
      });
      usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
      rolPermisosRepository.find.mockResolvedValue([
        { permisoId: 'permission-1' },
      ]);
      permisosRepository.find.mockResolvedValue([
        {
          codigo: 'reparaciones.gestionar',
        },
      ]);

      await expect(
        guard.canActivate(
          context({ userId: 'user-1', empresaId: 'company-1' }),
        ),
      ).resolves.toBe(true);
      const findOneArg = permisosRepository.find.mock.calls[0][0] as {
        where: { codigo: unknown };
      };
      expect(JSON.stringify(findOneArg.where.codigo)).toContain(required);
      expect(JSON.stringify(findOneArg.where.codigo)).toContain(
        'reparaciones.gestionar',
      );
    },
  );

  it('requires every permission declared by RequirePermissions', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([
        'repuestos.existencias.gestionar',
        'reparaciones.editar',
      ]);
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-stock' },
    ]);
    permisosRepository.find.mockResolvedValue([
      { codigo: 'repuestos.existencias.gestionar' },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).rejects.toThrow('Permiso requerido: reparaciones.editar');
  });

  it('allows all-of when every granular permission is granted', async () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue([
        'repuestos.existencias.gestionar',
        'reparaciones.editar',
      ]);
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-stock' },
      { permisoId: 'permission-order' },
    ]);
    permisosRepository.find.mockResolvedValue([
      { codigo: 'repuestos.existencias.gestionar' },
      { codigo: 'reparaciones.editar' },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);
  });

  it('allows any-of when one declared permission is granted', async () => {
    reflector.getAllAndOverride = jest.fn((key: string) =>
      key === 'requiredAnyPermission'
        ? ['reparaciones.ver', 'inventario.catalogos.gestionar']
        : undefined,
    );
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-repair-read' },
    ]);
    permisosRepository.find.mockResolvedValue([
      { codigo: 'reparaciones.ver' },
    ]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).resolves.toBe(true);
  });

  it('rejects any-of when none of the declared permissions is granted', async () => {
    reflector.getAllAndOverride = jest.fn((key: string) =>
      key === 'requiredAnyPermission'
        ? ['reparaciones.ver', 'inventario.catalogos.gestionar']
        : undefined,
    );
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-other' },
    ]);
    permisosRepository.find.mockResolvedValue([]);

    await expect(
      guard.canActivate(context({ userId: 'user-1', empresaId: 'company-1' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
