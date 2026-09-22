import { INestApplication, ValidationPipe } from '@nestjs/common';
jest.mock('@nestjs/mapped-types', () => ({
  PartialType: () => class {},
}));
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthService } from '../src/auth/auth.service';
import { PermissionsGuard } from '../src/auth/permissions.guard';
import { LicenciasEmpresaService } from '../src/licencias-empresa/licencias-empresa.service';
import { Permiso } from '../src/permisos/entities/permiso.entity';
import { PoliticasFormularioTallerController } from '../src/politicas-formulario-taller/politicas-formulario-taller.controller';
import { PoliticasFormularioTallerService } from '../src/politicas-formulario-taller/politicas-formulario-taller.service';
import { ProgramacionesMantenimientoController } from '../src/programaciones-mantenimiento/programaciones-mantenimiento.controller';
import { ProgramacionesMantenimientoService } from '../src/programaciones-mantenimiento/programaciones-mantenimiento.service';
import { ReparacionesActivoController } from '../src/reparaciones-activo/reparaciones-activo.controller';
import { ReparacionesActivoService } from '../src/reparaciones-activo/reparaciones-activo.service';
import { RolPermiso } from '../src/rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from '../src/usuario-roles/entities/usuario-role.entity';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { IdentificadoresQrActivoController } from '../src/identificadores-qr-activo/identificadores-qr-activo.controller';
import { IdentificadoresQrActivoService } from '../src/identificadores-qr-activo/identificadores-qr-activo.service';

describe('Workshop security API contract', () => {
  let app: INestApplication;
  let granted = new Set<string>();
  const id = '33333333-3333-4333-8333-333333333333';
  const token = 'Bearer workshop-token';
  const jwtService = {
    verifyAsync: jest.fn().mockResolvedValue({
      sub: 'user-1',
      empresaId: 'company-1',
      correo: 'workshop@example.com',
    }),
  };
  const authService = {
    validateUser: jest.fn().mockResolvedValue({ id: 'user-1' }),
  };
  const licenciaService = {
    evaluarModoSoloLectura: jest.fn().mockResolvedValue({ soloLectura: false }),
  };
  const usuarioRolesRepository = {
    find: jest.fn().mockResolvedValue([{ rolId: 'role-1' }]),
  };
  const rolPermisosRepository = {
    find: jest.fn(() =>
      Promise.resolve([...granted].map((codigo) => ({ permisoId: codigo }))),
    ),
  };
  const permisosRepository = {
    find: jest.fn((options: { where: { codigo: { _value: string[] } } }) => {
      const accepted = options.where.codigo._value;
      return Promise.resolve(
        [...granted]
          .filter((codigo) => accepted.includes(codigo))
          .map((codigo) => ({ id: codigo, codigo })),
      );
    }),
  };
  const usuariosRepository = {
    findOne: jest.fn().mockResolvedValue({ esPropietarioPlataforma: false }),
  };
  const repairs = {
    create: jest.fn().mockResolvedValue({ id }),
    findAll: jest.fn().mockResolvedValue([]),
    findOrdersReport: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue({ id }),
    findAssetTimeline: jest.fn().mockResolvedValue([]),
    update: jest.fn(),
    comunicarDiagnostico: jest.fn(),
    resolver: jest.fn().mockResolvedValue({ id, estado: 'cerrada' }),
    prepararFormulario: jest.fn(),
    findFormularios: jest.fn(),
    completarFormulario: jest.fn(),
    reservarRepuesto: jest.fn().mockResolvedValue({ id: 'movement-1' }),
    liberarRepuesto: jest.fn(),
    findRepuestos: jest.fn(),
    remove: jest.fn(),
  };
  const policies = {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const preventive = {
    create: jest.fn(),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    update: jest.fn(),
    generarOrden: jest.fn(),
    remove: jest.fn(),
  };
  const qr = {
    findByCodigoQr: jest.fn().mockResolvedValue({ id, codigoQr: 'QR-001' }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ReparacionesActivoController,
        PoliticasFormularioTallerController,
        ProgramacionesMantenimientoController,
        IdentificadoresQrActivoController,
      ],
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
        { provide: ReparacionesActivoService, useValue: repairs },
        { provide: PoliticasFormularioTallerService, useValue: policies },
        { provide: ProgramacionesMantenimientoService, useValue: preventive },
        { provide: IdentificadoresQrActivoService, useValue: qr },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    granted = new Set<string>();
    jest.clearAllMocks();
  });

  const cases = [
    {
      name: 'read',
      method: 'get' as const,
      path: '/reparaciones-activo',
      permissions: ['reparaciones.ver'],
    },
    {
      name: 'create',
      method: 'post' as const,
      path: '/reparaciones-activo',
      permissions: ['reparaciones.crear'],
      body: {
        activoId: id,
        tipoServicio: 'reparacion',
        diagnostico: 'Diagnostico inicial',
        fechaIngreso: '2026-09-22T10:00:00.000Z',
      },
    },
    {
      name: 'reserve',
      method: 'post' as const,
      path: `/reparaciones-activo/${id}/reservar-repuesto`,
      permissions: ['repuestos.existencias.gestionar', 'reparaciones.editar'],
      body: { piezaRepuestoId: id, cantidad: '1' },
    },
    {
      name: 'resolve',
      method: 'post' as const,
      path: `/reparaciones-activo/${id}/resolver`,
      permissions: ['reparaciones.resolver'],
      body: {
        resultado: 'resuelto',
        resolucion: 'Trabajo completado',
        fechaSalida: '2026-09-22T12:00:00.000Z',
        cambiosComponentes: [],
      },
    },
    {
      name: 'policy',
      method: 'get' as const,
      path: '/politicas-formulario-taller',
      permissions: ['reparaciones.formularios.gestionar'],
    },
    {
      name: 'preventive',
      method: 'get' as const,
      path: '/programaciones-mantenimiento',
      permissions: ['mantenimiento.preventivo.ver'],
    },
    {
      name: 'report',
      method: 'get' as const,
      path: '/reparaciones-activo/reportes/ordenes',
      permissions: ['reparaciones.reportes.ver'],
    },
    {
      name: 'timeline',
      method: 'get' as const,
      path: `/reparaciones-activo/activo/${id}/linea-tiempo`,
      permissions: ['reparaciones.ver'],
    },
    {
      name: 'QR lookup for workshop reader',
      method: 'get' as const,
      path: '/identificadores-qr-activo/codigo/QR-001',
      permissions: ['reparaciones.ver'],
    },
  ];

  it.each(cases)(
    'enforces 401, 403 and positive access for $name',
    async (testCase) => {
      const send = (withToken: boolean) => {
        let operation = request(app.getHttpServer())[testCase.method](
          testCase.path,
        );
        if (withToken) operation = operation.set('Authorization', token);
        if (testCase.body) operation = operation.send(testCase.body);
        return operation;
      };

      await send(false).expect(401);
      await send(true).expect(403);
      granted = new Set(testCase.permissions);
      await send(true).expect(testCase.method === 'post' ? 201 : 200);
    },
  );

  it('does not let a warehouse-only role reserve or resolve an order', async () => {
    granted = new Set(['repuestos.existencias.gestionar']);

    await request(app.getHttpServer())
      .post(`/reparaciones-activo/${id}/reservar-repuesto`)
      .set('Authorization', token)
      .send({ piezaRepuestoId: id, cantidad: '1' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/reparaciones-activo/${id}/resolver`)
      .set('Authorization', token)
      .send({
        resultado: 'resuelto',
        resolucion: 'Trabajo completado',
        fechaSalida: '2026-09-22T12:00:00.000Z',
        cambiosComponentes: [],
      })
      .expect(403);
    await request(app.getHttpServer())
      .delete(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .expect(403);
    expect(repairs.remove).not.toHaveBeenCalled();
  });

  it('authorizes PATCH fields independently', async () => {
    granted = new Set(['reparaciones.diagnosticar']);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ diagnostico: 'Diagnostico autorizado' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ costo: '10.00' })
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ estado: 'en_proceso' })
      .expect(403);

    granted = new Set(['reparaciones.costos.gestionar']);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ costo: '10.00', moneda: 'USD' })
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ diagnostico: 'Cambio no autorizado' })
      .expect(403);
  });

  it('rejects negative repair cost before invoking the service', async () => {
    granted = new Set(['reparaciones.costos.gestionar']);
    await request(app.getHttpServer())
      .patch(`/reparaciones-activo/${id}`)
      .set('Authorization', token)
      .send({ costo: '-1.00' })
      .expect(400);
  });

  it('keeps reparaciones.gestionar as a temporary alias', async () => {
    granted = new Set(['reparaciones.gestionar']);

    await request(app.getHttpServer())
      .post(`/reparaciones-activo/${id}/reservar-repuesto`)
      .set('Authorization', token)
      .send({ piezaRepuestoId: id, cantidad: '1' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/reparaciones-activo/${id}/resolver`)
      .set('Authorization', token)
      .send({
        resultado: 'resuelto',
        resolucion: 'Trabajo completado',
        fechaSalida: '2026-09-22T12:00:00.000Z',
        cambiosComponentes: [],
      })
      .expect(201);
  });
});
