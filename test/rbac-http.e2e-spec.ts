import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../src/auth/auth.guard';
import { PermissionsGuard } from '../src/auth/permissions.guard';
import { AuthService } from '../src/auth/auth.service';
import { LicenciasEmpresaService } from '../src/licencias-empresa/licencias-empresa.service';
import { UsuarioRol } from '../src/usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../src/rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../src/permisos/entities/permiso.entity';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { RequirePermission } from '../src/auth/decorators/require-permission.decorator';

@Controller('rbac-test')
class RbacTestController {
  @Get('protected')
  @RequirePermission('seguridad.roles.gestionar')
  protectedRoute() {
    return { ok: true };
  }

  @Get('activos')
  @RequirePermission('activos.gestionar')
  activosRoute() {
    return { ok: true };
  }

  @Get('telecom')
  @RequirePermission('telecom.gestionar')
  telecomRoute() {
    return { ok: true };
  }

  @Get('formularios')
  @RequirePermission('formularios.gestionar')
  formulariosRoute() {
    return { ok: true };
  }

  @Get('auditorias')
  @RequirePermission('auditorias.ver')
  auditoriasRoute() {
    return { ok: true };
  }

  @Get('solicitudes')
  @RequirePermission('solicitudes.gestionar')
  solicitudesRoute() {
    return { ok: true };
  }

  @Get('integraciones')
  @RequirePermission('integraciones.gestionar')
  integracionesRoute() {
    return { ok: true };
  }

  @Get('plataforma')
  @RequirePermission('plataforma.empresas.gestionar')
  plataformaRoute() {
    return { ok: true };
  }

  @Get('plataforma-licencias')
  @RequirePermission('plataforma.licencias.gestionar')
  plataformaLicenciasRoute() {
    return { ok: true };
  }
}

describe('RBAC HTTP contract', () => {
  let app: INestApplication;
  const jwtService = { verifyAsync: jest.fn() };
  const authService = { validateUser: jest.fn() };
  const licenciaService = {
    evaluarModoSoloLectura: jest.fn().mockResolvedValue({ soloLectura: false }),
  };
  const usuarioRolesRepository = { find: jest.fn() };
  const rolPermisosRepository = { find: jest.fn() };
  const permisosRepository = { findOne: jest.fn() };
  const usuariosRepository = { findOne: jest.fn() };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [RbacTestController],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: authService },
        { provide: LicenciasEmpresaService, useValue: licenciaService },
        {
          provide: getRepositoryToken(UsuarioRol),
          useValue: usuarioRolesRepository,
        },
        {
          provide: getRepositoryToken(RolPermiso),
          useValue: rolPermisosRepository,
        },
        { provide: getRepositoryToken(Permiso), useValue: permisosRepository },
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepository },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
    jest.clearAllMocks();
    licenciaService.evaluarModoSoloLectura.mockResolvedValue({
      soloLectura: false,
    });
  });

  afterEach(async () => app.close());

  it('returns 401 before permission evaluation when bearer token is absent', async () => {
    await request(app.getHttpServer()).get('/rbac-test/protected').expect(401);
    expect(usuarioRolesRepository.find).not.toHaveBeenCalled();
  });

  it('returns 401 for all protected surfaces without bearer token', async () => {
    const endpoints = [
      '/rbac-test/activos',
      '/rbac-test/telecom',
      '/rbac-test/formularios',
      '/rbac-test/auditorias',
      '/rbac-test/solicitudes',
      '/rbac-test/integraciones',
      '/rbac-test/plataforma',
      '/rbac-test/plataforma-licencias',
    ];

    for (const endpoint of endpoints) {
      await request(app.getHttpServer()).get(endpoint).expect(401);
    }
  });

  it('exposes public liveness/readiness routes separately from protected routes', async () => {
    expect((await request(app.getHttpServer()).get('/health')).status).not.toBe(
      401,
    );
  });

  it('returns 403 when authenticated user lacks the dynamic permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      empresaId: 'company-1',
      correo: 'user@example.com',
    });
    authService.validateUser.mockResolvedValue({ id: 'user-1' });
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([
      { permisoId: 'permission-other' },
    ]);
    permisosRepository.findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/rbac-test/protected')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('returns 403 across surfaces when permission is missing', async () => {
    const surfaces = [
      {
        endpoint: '/rbac-test/activos',
        requiredPermission: 'activos.gestionar',
      },
      {
        endpoint: '/rbac-test/telecom',
        requiredPermission: 'telecom.gestionar',
      },
      {
        endpoint: '/rbac-test/formularios',
        requiredPermission: 'formularios.gestionar',
      },
      { endpoint: '/rbac-test/auditorias', requiredPermission: 'auditorias.ver' },
      {
        endpoint: '/rbac-test/solicitudes',
        requiredPermission: 'solicitudes.gestionar',
      },
      {
        endpoint: '/rbac-test/integraciones',
        requiredPermission: 'integraciones.gestionar',
      },
      {
        endpoint: '/rbac-test/plataforma',
        requiredPermission: 'plataforma.empresas.gestionar',
      },
      {
        endpoint: '/rbac-test/plataforma-licencias',
        requiredPermission: 'plataforma.licencias.gestionar',
      },
    ];

    for (const surface of surfaces) {
      jwtService.verifyAsync.mockResolvedValue({
        sub: 'user-1',
        empresaId: 'company-1',
        correo: 'user@example.com',
      });
      authService.validateUser.mockResolvedValue({ id: 'user-1' });
      usuariosRepository.findOne.mockResolvedValue({
        esPropietarioPlataforma: false,
      });
      usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
      rolPermisosRepository.find.mockResolvedValue([
        { permisoId: 'permission-other' },
      ]);
      permisosRepository.findOne.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get(surface.endpoint)
        .set('Authorization', 'Bearer valid-token')
        .expect(403);

      expect(permisosRepository.findOne).toHaveBeenLastCalledWith({
        where: {
          id: expect.anything(),
          codigo: surface.requiredPermission,
        },
      });
    }
  });

  it('returns 200 when authenticated user has required permission', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      empresaId: 'company-1',
      correo: 'user@example.com',
    });
    authService.validateUser.mockResolvedValue({ id: 'user-1' });
    usuariosRepository.findOne.mockResolvedValue({ esPropietarioPlataforma: false });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({
      id: 'permission-1',
      codigo: 'seguridad.roles.gestionar',
    });

    await request(app.getHttpServer())
      .get('/rbac-test/protected')
      .set('Authorization', 'Bearer valid-token')
      .expect(200);
  });
});
