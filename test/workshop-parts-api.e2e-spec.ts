import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { MovimientosRepuestosController } from '../src/movimientos-repuestos/movimientos-repuestos.controller';
import { MovimientosRepuestosService } from '../src/movimientos-repuestos/movimientos-repuestos.service';
import { PiezasRepuestosController } from '../src/piezas-repuestos/piezas-repuestos.controller';
import { PiezasRepuestosService } from '../src/piezas-repuestos/piezas-repuestos.service';
import { ReparacionesActivoController } from '../src/reparaciones-activo/reparaciones-activo.controller';
import { ReparacionesActivoService } from '../src/reparaciones-activo/reparaciones-activo.service';
import { UnidadesRepuestosController } from '../src/unidades-repuestos/unidades-repuestos.controller';
import { UnidadesRepuestosService } from '../src/unidades-repuestos/unidades-repuestos.service';
import { ExistenciasRepuestosController } from '../src/existencias-repuestos/existencias-repuestos.controller';
import { ExistenciasRepuestosService } from '../src/existencias-repuestos/existencias-repuestos.service';
import { ComponentesInstaladosActivoController } from '../src/componentes-instalados-activo/componentes-instalados-activo.controller';
import { ComponentesInstaladosActivoService } from '../src/componentes-instalados-activo/componentes-instalados-activo.service';

describe('Workshop parts API contract (isolated)', () => {
  let app: INestApplication;

  const user = {
    userId: '22222222-2222-4222-8222-222222222222',
    empresaId: '11111111-1111-4111-8111-111111111111',
    correo: 'taller@sgcaet.test',
  };
  const piezaId = '33333333-3333-4333-8333-333333333333';
  const especificacionId = '44444444-4444-4444-8444-444444444444';
  const reparacionId = '55555555-5555-4555-8555-555555555555';
  const unidadId = '66666666-6666-4666-8666-666666666666';
  const foreignId = '77777777-7777-4777-8777-777777777777';

  const piezasService = {
    create: jest.fn(),
    findApplicable: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const movimientosService = {
    createEntry: jest.fn(),
    createAdjustment: jest.fn(),
    findAll: jest.fn(),
  };
  const unidadesService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };
  const existenciasService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const componentesService = {
    findByActivo: jest.fn(),
  };
  const reparacionesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAssetTimeline: jest.fn(),
    update: jest.fn(),
    comunicarDiagnostico: jest.fn(),
    resolver: jest.fn(),
    reservarRepuesto: jest.fn(),
    liberarRepuesto: jest.fn(),
    findRepuestos: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [
        PiezasRepuestosController,
        MovimientosRepuestosController,
        ReparacionesActivoController,
        UnidadesRepuestosController,
        ExistenciasRepuestosController,
        ComponentesInstaladosActivoController,
      ],
      providers: [
        { provide: PiezasRepuestosService, useValue: piezasService },
        { provide: MovimientosRepuestosService, useValue: movimientosService },
        { provide: ReparacionesActivoService, useValue: reparacionesService },
        { provide: UnidadesRepuestosService, useValue: unidadesService },
        { provide: ExistenciasRepuestosService, useValue: existenciasService },
        {
          provide: ComponentesInstaladosActivoService,
          useValue: componentesService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
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

  afterEach(async () => {
    await app.close();
  });

  describe('piezas-repuestos', () => {
    it('creates a workshop part and derives the tenant and actor from request.user', async () => {
      const payload = {
        especificacionTipoActivoId: especificacionId,
        codigo: 'RAM-16-DDR5',
        nombreComercial: 'Memoria RAM 16 GB DDR5',
        fabricante: 'Kingston',
        capacidad: '16',
        unidad: 'GB',
        esSerializado: false,
        stockMinimo: '2',
        costoReferencial: '45.50',
        moneda: 'USD',
      };
      piezasService.create.mockResolvedValue({ id: piezaId, ...payload });

      await request(app.getHttpServer())
        .post('/piezas-repuestos')
        .send(payload)
        .expect(201)
        .expect(({ body }) =>
          expect((body as { id: string }).id).toBe(piezaId),
        );

      expect(piezasService.create).toHaveBeenCalledWith(payload, user);
    });

    it('routes /aplicables before /:id', async () => {
      piezasService.findApplicable.mockResolvedValue([{ id: piezaId }]);

      await request(app.getHttpServer())
        .get('/piezas-repuestos/aplicables')
        .query({ activoId: piezaId })
        .expect(200)
        .expect([{ id: piezaId }]);

      expect(piezasService.findApplicable).toHaveBeenCalledWith(piezaId, user);
      expect(piezasService.findOne).not.toHaveBeenCalled();
    });

    it('does not expose a piece from another tenant', async () => {
      piezasService.findOne.mockRejectedValue(
        new NotFoundException('Pieza de repuesto no encontrada'),
      );

      await request(app.getHttpServer())
        .get(`/piezas-repuestos/${foreignId}`)
        .expect(404);

      expect(piezasService.findOne).toHaveBeenCalledWith(foreignId, user);
    });
  });

  describe('unidades y existencias tenant-scoped', () => {
    it('passes tenant context when a foreign piece is used to create a unit', async () => {
      const payload = {
        piezaRepuestoId: foreignId,
        numeroSerie: 'FOREIGN-001',
      };
      unidadesService.create.mockRejectedValue(
        new NotFoundException('Pieza de repuesto no encontrada'),
      );

      await request(app.getHttpServer())
        .post('/unidades-repuestos')
        .send(payload)
        .expect(404);

      expect(unidadesService.create).toHaveBeenCalledWith(payload, user);
    });

    it('scopes unit filters and stock lookup to request.user', async () => {
      unidadesService.findAll.mockResolvedValue([]);
      existenciasService.findOne.mockRejectedValue(
        new NotFoundException('Pieza de repuesto no encontrada'),
      );

      await request(app.getHttpServer())
        .get('/unidades-repuestos')
        .query({ piezaRepuestoId: foreignId, estado: 'disponible' })
        .expect(200, []);
      await request(app.getHttpServer())
        .get(`/existencias-repuestos/${foreignId}`)
        .expect(404);

      expect(unidadesService.findAll).toHaveBeenCalledWith(
        user,
        foreignId,
        'disponible',
      );
      expect(existenciasService.findOne).toHaveBeenCalledWith(foreignId, user);
    });
  });

  describe('movimientos-repuestos', () => {
    it('accepts valid entrada and ajuste payloads', async () => {
      const entrada = {
        piezaRepuestoId: piezaId,
        cantidad: '5',
        costoEntrada: '42.25',
        moneda: 'USD',
        motivo: 'Compra inicial',
      };
      const ajuste = {
        piezaRepuestoId: piezaId,
        tipoMovimiento: 'ajuste_neg',
        cantidad: '1',
        motivo: 'Diferencia de inventario fisico',
      };
      movimientosService.createEntry.mockResolvedValue({ id: 'entrada-1' });
      movimientosService.createAdjustment.mockResolvedValue({ id: 'ajuste-1' });

      await request(app.getHttpServer())
        .post('/movimientos-repuestos/entrada')
        .send(entrada)
        .expect(201);
      await request(app.getHttpServer())
        .post('/movimientos-repuestos/ajuste')
        .send(ajuste)
        .expect(201);

      expect(movimientosService.createEntry).toHaveBeenCalledWith(
        entrada,
        user,
      );
      expect(movimientosService.createAdjustment).toHaveBeenCalledWith(
        ajuste,
        user,
      );
    });

    it.each([
      [
        'entrada negativa',
        '/movimientos-repuestos/entrada',
        { piezaRepuestoId: piezaId, cantidad: '-2' },
        movimientosService.createEntry,
      ],
      [
        'entrada no numerica',
        '/movimientos-repuestos/entrada',
        { piezaRepuestoId: piezaId, cantidad: 'cinco' },
        movimientosService.createEntry,
      ],
      [
        'ajuste negativo',
        '/movimientos-repuestos/ajuste',
        {
          piezaRepuestoId: piezaId,
          tipoMovimiento: 'ajuste_pos',
          cantidad: '-1',
          motivo: 'Conteo fisico',
        },
        movimientosService.createAdjustment,
      ],
      [
        'ajuste no numerico',
        '/movimientos-repuestos/ajuste',
        {
          piezaRepuestoId: piezaId,
          tipoMovimiento: 'ajuste_neg',
          cantidad: 'uno',
          motivo: 'Conteo fisico',
        },
        movimientosService.createAdjustment,
      ],
    ])(
      'rejects %s before invoking the service',
      async (_case, path, payload, serviceMethod) => {
        await request(app.getHttpServer()).post(path).send(payload).expect(400);
        expect(serviceMethod).not.toHaveBeenCalled();
      },
    );

    it('scopes movement filters to the authenticated tenant', async () => {
      movimientosService.findAll.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get('/movimientos-repuestos')
        .query({ piezaRepuestoId: foreignId })
        .expect(200, []);

      expect(movimientosService.findAll).toHaveBeenCalledWith(user, foreignId);
    });
  });

  describe('componentes instalados tenant-scoped', () => {
    it.each([
      ['/componentes-instalados-activo', false],
      ['/componentes-instalados-activo/historial', true],
    ])('does not expose a foreign asset through %s', async (path, history) => {
      componentesService.findByActivo.mockRejectedValue(
        new NotFoundException('Activo no encontrado'),
      );

      await request(app.getHttpServer())
        .get(path)
        .query({ activoId: foreignId })
        .expect(404);

      expect(componentesService.findByActivo).toHaveBeenCalledWith(
        foreignId,
        history,
        user,
      );
    });
  });

  describe('reparaciones-activo parts routing', () => {
    it('routes the asset timeline before /:id and keeps tenant context', async () => {
      reparacionesService.findAssetTimeline.mockResolvedValue([
        {
          id: 'repair:1',
          type: 'repair',
          title: 'Orden de reparación',
          description: 'Diagnóstico',
          date: '2026-09-22T10:00:00.000Z',
        },
      ]);

      await request(app.getHttpServer())
        .get(`/reparaciones-activo/activo/${piezaId}/linea-tiempo`)
        .expect(200)
        .expect(({ body }) => expect(body[0].type).toBe('repair'));

      expect(reparacionesService.findAssetTimeline).toHaveBeenCalledWith(
        piezaId,
        user,
      );
      expect(reparacionesService.findOne).not.toHaveBeenCalled();
    });

    it('does not expose a cross-tenant asset timeline', async () => {
      reparacionesService.findAssetTimeline.mockRejectedValue(
        new NotFoundException('Activo no encontrado'),
      );

      await request(app.getHttpServer())
        .get(`/reparaciones-activo/activo/${foreignId}/linea-tiempo`)
        .expect(404);

      expect(reparacionesService.findAssetTimeline).toHaveBeenCalledWith(
        foreignId,
        user,
      );
    });

    it('routes reserve, release, list parts and resolve to their exact service methods', async () => {
      const reservePayload = {
        piezaRepuestoId: piezaId,
        unidadRepuestoId: unidadId,
        cantidad: '1',
        motivo: 'Reservada para diagnostico',
      };
      const releasePayload = {
        piezaRepuestoId: piezaId,
        unidadRepuestoId: unidadId,
        cantidad: '1',
        motivo: 'Ya no requerida',
      };
      const resolvePayload = {
        resultado: 'resuelto',
        resolucion: 'Componente sustituido correctamente',
        fechaSalida: '2026-09-22T15:00:00.000Z',
        cambiosComponentes: [],
        repuestosReservados: [
          {
            piezaRepuestoId: piezaId,
            unidadRepuestoId: unidadId,
            cantidad: '1',
          },
        ],
      };
      reparacionesService.reservarRepuesto.mockResolvedValue({ ok: true });
      reparacionesService.liberarRepuesto.mockResolvedValue({ ok: true });
      reparacionesService.findRepuestos.mockResolvedValue([{ id: piezaId }]);
      reparacionesService.resolver.mockResolvedValue({ id: reparacionId });

      await request(app.getHttpServer())
        .post(`/reparaciones-activo/${reparacionId}/reservar-repuesto`)
        .send(reservePayload)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/reparaciones-activo/${reparacionId}/liberar-repuesto`)
        .send(releasePayload)
        .expect(201);
      await request(app.getHttpServer())
        .get(`/reparaciones-activo/${reparacionId}/repuestos`)
        .expect(200)
        .expect([{ id: piezaId }]);
      await request(app.getHttpServer())
        .post(`/reparaciones-activo/${reparacionId}/resolver`)
        .send(resolvePayload)
        .expect(201);

      expect(reparacionesService.reservarRepuesto).toHaveBeenCalledWith(
        reparacionId,
        reservePayload,
        user,
      );
      expect(reparacionesService.liberarRepuesto).toHaveBeenCalledWith(
        reparacionId,
        releasePayload,
        user,
      );
      expect(reparacionesService.findRepuestos).toHaveBeenCalledWith(
        reparacionId,
        user,
      );
      expect(reparacionesService.resolver).toHaveBeenCalledWith(
        reparacionId,
        resolvePayload,
        user,
      );
      expect(reparacionesService.findOne).not.toHaveBeenCalled();
    });

    it('rejects PATCH estado=cancelada at DTO validation', async () => {
      await request(app.getHttpServer())
        .patch(`/reparaciones-activo/${reparacionId}`)
        .send({ estado: 'cancelada' })
        .expect(400);

      expect(reparacionesService.update).not.toHaveBeenCalled();
    });

    it('rejects non-whitelisted workshop fields', async () => {
      await request(app.getHttpServer())
        .post(`/reparaciones-activo/${reparacionId}/reservar-repuesto`)
        .send({
          piezaRepuestoId: piezaId,
          cantidad: '1',
          empresaId: user.empresaId,
        })
        .expect(400);

      expect(reparacionesService.reservarRepuesto).not.toHaveBeenCalled();
    });

    it.each([
      [
        'reserve',
        'post',
        `/reparaciones-activo/${foreignId}/reservar-repuesto`,
      ],
      ['release', 'post', `/reparaciones-activo/${foreignId}/liberar-repuesto`],
      ['list', 'get', `/reparaciones-activo/${foreignId}/repuestos`],
    ])(
      'does not expose a foreign repair through %s',
      async (_case, method, path) => {
        const serviceMethod =
          method === 'get'
            ? reparacionesService.findRepuestos
            : path.includes('liberar')
              ? reparacionesService.liberarRepuesto
              : reparacionesService.reservarRepuesto;
        serviceMethod.mockRejectedValue(
          new NotFoundException(`Reparacion ${foreignId} no encontrada`),
        );

        const operation = request(app.getHttpServer())[
          method as 'get' | 'post'
        ](path);
        if (method === 'post') {
          operation.send({ piezaRepuestoId: piezaId, cantidad: '1' });
        }
        await operation.expect(404);

        expect(serviceMethod).toHaveBeenCalledWith(
          foreignId,
          ...(method === 'post'
            ? [{ piezaRepuestoId: piezaId, cantidad: '1' }, user]
            : [user]),
        );
      },
    );
  });
});
