import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '../src/auth/auth.guard';
import { PermissionsGuard } from '../src/auth/permissions.guard';
import { AuthService } from '../src/auth/auth.service';
import { UsuarioRol } from '../src/usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../src/rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../src/permisos/entities/permiso.entity';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { Empresa } from '../src/empresas/entities/empresa.entity';
import { BitacoraAuditoriaSistema } from '../src/bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { EmpresasController } from '../src/empresas/empresas.controller';
import { EmpresasService } from '../src/empresas/empresas.service';
import { TargetTenantContextService } from '../src/auth/target-tenant-context.service';
import { LicenciasEmpresaController } from '../src/licencias-empresa/licencias-empresa.controller';
import { LicenciasEmpresaService } from '../src/licencias-empresa/licencias-empresa.service';

@Controller('health')
class HealthTestController {
  @Get()
  ping() {
    return { status: 'ok' };
  }
}

describe('Platform global access matrix', () => {
  let app: INestApplication;

  const jwtService = { verifyAsync: jest.fn() };
  const authService = { validateUser: jest.fn() };

  const usuarioRolesRepository = { find: jest.fn() };
  const rolPermisosRepository = { find: jest.fn() };
  const permisosRepository = { findOne: jest.fn() };
  const usuariosRepository = { findOne: jest.fn() };
  const empresasRepository = { findOne: jest.fn() };
  const bitacoraRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };

  const empresasServiceMock = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const licenciasServiceMock = {
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    evaluarModoSoloLectura: jest.fn().mockResolvedValue({ soloLectura: false }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthTestController, EmpresasController, LicenciasEmpresaController],
      providers: [
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        { provide: JwtService, useValue: jwtService },
        { provide: AuthService, useValue: authService },
        { provide: EmpresasService, useValue: empresasServiceMock },
        { provide: LicenciasEmpresaService, useValue: licenciasServiceMock },
        TargetTenantContextService,
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
        { provide: getRepositoryToken(Empresa), useValue: empresasRepository },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepository,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    jest.clearAllMocks();

    authService.validateUser.mockResolvedValue({ id: 'user-1' });
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'perm-1' }]);
    permisosRepository.findOne.mockImplementation(({ where }: { where: { codigo: string } }) => {
      const allowed = [
        'plataforma.empresas.gestionar',
        'plataforma.licencias.gestionar',
      ];
      if (allowed.includes(where.codigo)) {
        return Promise.resolve({ id: 'perm-1', codigo: where.codigo });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns 401 for platform routes without bearer token', async () => {
    await request(app.getHttpServer()).get('/empresas').expect(401);
    await request(app.getHttpServer()).get('/licencias-empresa').expect(401);
  });

  it('returns 403 when user has permission but is not PlatformOwner', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user-1',
      empresaId: 'empresa-actor',
      correo: 'user@test.local',
    });
    usuariosRepository.findOne.mockResolvedValue({ esPropietarioPlataforma: false });

    await request(app.getHttpServer())
      .get('/empresas')
      .set('Authorization', 'Bearer valid-token')
      .expect(403);
  });

  it('returns 400 when PlatformOwner selects an unknown target tenant', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'owner-1',
      empresaId: 'empresa-owner',
      correo: 'owner@test.local',
    });
    usuariosRepository.findOne.mockResolvedValue({ esPropietarioPlataforma: true });
    empresasRepository.findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get('/licencias-empresa')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Target-Empresa-Id', 'empresa-inexistente')
      .expect(400);
  });

  it('returns 200 when PlatformOwner queries global endpoints with valid target tenant', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'owner-1',
      empresaId: 'empresa-owner',
      correo: 'owner@test.local',
    });
    usuariosRepository.findOne.mockResolvedValue({ esPropietarioPlataforma: true });
    empresasRepository.findOne.mockResolvedValue({ id: 'empresa-target' });

    await request(app.getHttpServer())
      .get('/licencias-empresa')
      .set('Authorization', 'Bearer valid-token')
      .set('X-Target-Empresa-Id', 'empresa-target')
      .expect(200);

    expect(licenciasServiceMock.findAll).toHaveBeenCalledWith('empresa-target');
  });
});
