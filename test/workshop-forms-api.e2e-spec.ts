import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { ReparacionesActivoController } from '../src/reparaciones-activo/reparaciones-activo.controller';
import { ReparacionesActivoService } from '../src/reparaciones-activo/reparaciones-activo.service';
import { PoliticasFormularioTallerController } from '../src/politicas-formulario-taller/politicas-formulario-taller.controller';
import { PoliticasFormularioTallerService } from '../src/politicas-formulario-taller/politicas-formulario-taller.service';

describe('Workshop forms API contract (isolated)', () => {
  let app: INestApplication;
  const user = {
    userId: '22222222-2222-4222-8222-222222222222',
    empresaId: '11111111-1111-4111-8111-111111111111',
    correo: 'taller@sgcaet.test',
  };
  const repairId = '33333333-3333-4333-8333-333333333333';
  const instanceId = '44444444-4444-4444-8444-444444444444';
  const formId = '55555555-5555-4555-8555-555555555555';
  const categoryId = '66666666-6666-4666-8666-666666666666';
  const foreignId = '77777777-7777-4777-8777-777777777777';
  const repairs = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    comunicarDiagnostico: jest.fn(),
    resolver: jest.fn(),
    prepararFormulario: jest.fn(),
    findFormularios: jest.fn(),
    completarFormulario: jest.fn(),
    reservarRepuesto: jest.fn(),
    liberarRepuesto: jest.fn(),
    findRepuestos: jest.fn(),
    remove: jest.fn(),
  };
  const policies = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ReparacionesActivoController,
        PoliticasFormularioTallerController,
      ],
      providers: [
        { provide: ReparacionesActivoService, useValue: repairs },
        { provide: PoliticasFormularioTallerService, useValue: policies },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: typeof user }).user = user;
      next();
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(() => app.close());

  it('prepares, lists and completes a repair form using tenant context', async () => {
    repairs.prepararFormulario.mockResolvedValue({
      id: instanceId,
      etapa: 'entrada',
      valoresIniciales: { numero_inventario: 'INV-001' },
    });
    repairs.findFormularios.mockResolvedValue([
      {
        id: instanceId,
        formularioVersionId: formId,
        valoresIniciales: {
          numero_inventario: 'INV-001',
          fecha_salida: '',
        },
      },
    ]);
    repairs.completarFormulario.mockResolvedValue({
      id: instanceId,
      estado: 'completado',
    });

    const prepared = await request(app.getHttpServer())
      .post(`/reparaciones-activo/${repairId}/preparar-formulario/entrada`)
      .expect(201);
    expect(prepared.body.valoresIniciales.numero_inventario).toBe('INV-001');
    const listed = await request(app.getHttpServer())
      .get(`/reparaciones-activo/${repairId}/formularios`)
      .expect(200);
    expect(listed.body[0]).toMatchObject({
      formularioVersionId: formId,
      valoresIniciales: {
        numero_inventario: 'INV-001',
        fecha_salida: '',
      },
    });
    await request(app.getHttpServer())
      .post(
        `/reparaciones-activo/${repairId}/formularios/${instanceId}/completar`,
      )
      .send({
        detalles: [{ campoClave: 'diagnostico', valorTexto: 'Correcto' }],
      })
      .expect(201);

    expect(repairs.prepararFormulario).toHaveBeenCalledWith(
      repairId,
      'entrada',
      user,
    );
    expect(repairs.findFormularios).toHaveBeenCalledWith(repairId, user);
    expect(repairs.completarFormulario).toHaveBeenCalledWith(
      repairId,
      instanceId,
      { detalles: [{ campoClave: 'diagnostico', valorTexto: 'Correcto' }] },
      user,
    );
  });

  it('exposes tenant-scoped policy CRUD', async () => {
    const payload = {
      tipoServicio: 'reparacion',
      etapa: 'entrada',
      categoriaEquipoId: categoryId,
      formularioId: formId,
      esObligatoria: true,
    };
    policies.create.mockResolvedValue({ id: instanceId, ...payload });
    await request(app.getHttpServer())
      .post('/politicas-formulario-taller')
      .send(payload)
      .expect(201);
    expect(policies.create).toHaveBeenCalledWith(payload, user);
    policies.findAll.mockResolvedValue([{ id: instanceId, ...payload }]);
    policies.findOne.mockResolvedValue({ id: instanceId, ...payload });
    policies.update.mockResolvedValue({
      id: instanceId,
      ...payload,
      esObligatoria: false,
    });
    policies.remove.mockResolvedValue({
      id: instanceId,
      ...payload,
      estaActiva: false,
    });
    await request(app.getHttpServer())
      .get('/politicas-formulario-taller')
      .expect(200);
    await request(app.getHttpServer())
      .get(`/politicas-formulario-taller/${instanceId}`)
      .expect(200);
    await request(app.getHttpServer())
      .patch(`/politicas-formulario-taller/${instanceId}`)
      .send({ esObligatoria: false })
      .expect(200);
    await request(app.getHttpServer())
      .delete(`/politicas-formulario-taller/${instanceId}`)
      .expect(200);
    expect(policies.findAll).toHaveBeenCalledWith(user);
    expect(policies.update).toHaveBeenCalledWith(
      instanceId,
      { esObligatoria: false },
      user,
    );
    expect(policies.remove).toHaveBeenCalledWith(instanceId, user);
  });

  it('rejects invalid stages before reaching the service', async () => {
    await request(app.getHttpServer())
      .post('/politicas-formulario-taller')
      .send({
        tipoServicio: 'reparacion',
        etapa: 'diagnostico',
        formularioId: formId,
      })
      .expect(400);
    expect(policies.create).not.toHaveBeenCalled();
  });

  it.each([
    [
      'prepare',
      'post',
      `/reparaciones-activo/${foreignId}/preparar-formulario/entrada`,
    ],
    ['list', 'get', `/reparaciones-activo/${foreignId}/formularios`],
    [
      'complete',
      'post',
      `/reparaciones-activo/${foreignId}/formularios/${instanceId}/completar`,
    ],
  ])(
    'does not expose foreign repair forms through %s',
    async (_case, method, path) => {
      const serviceMethod = path.includes('preparar')
        ? repairs.prepararFormulario
        : path.includes('completar')
          ? repairs.completarFormulario
          : repairs.findFormularios;
      serviceMethod.mockRejectedValue(
        new NotFoundException('Reparacion no encontrada'),
      );

      const operation = request(app.getHttpServer())[method as 'get' | 'post'](
        path,
      );
      if (path.includes('completar')) operation.send({ detalles: [] });
      await operation.expect(404);

      if (path.includes('preparar')) {
        expect(serviceMethod).toHaveBeenCalledWith(foreignId, 'entrada', user);
      } else if (path.includes('completar')) {
        expect(serviceMethod).toHaveBeenCalledWith(
          foreignId,
          instanceId,
          { detalles: [] },
          user,
        );
      } else {
        expect(serviceMethod).toHaveBeenCalledWith(foreignId, user);
      }
    },
  );

  it('does not expose a policy from another tenant', async () => {
    policies.findOne.mockRejectedValue(
      new NotFoundException('Politica no encontrada'),
    );

    await request(app.getHttpServer())
      .get(`/politicas-formulario-taller/${foreignId}`)
      .expect(404);

    expect(policies.findOne).toHaveBeenCalledWith(foreignId, user);
  });
});
