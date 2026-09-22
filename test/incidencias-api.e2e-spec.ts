import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { IncidenciasController } from '../src/incidencias/incidencias.controller';
import { IncidenciasService } from '../src/incidencias/incidencias.service';

describe('Incidencias API contract (isolated)', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [IncidenciasController],
      providers: [{ provide: IncidenciasService, useValue: service }],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use((request: any, _response: any, next: () => void) => {
      request.user = {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
      };
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

  it('rechaza POST con estado cerrado sin fecha de cierre a nivel de DTO', async () => {
    await request(app.getHttpServer())
      .post('/incidencias')
      .send({
        empresaId: '11111111-1111-1111-1111-111111111111',
        codigo: 'INC-001',
        titulo: 'Linea sin servicio',
        estado: 'cerrada',
        usuarioActorId: '22222222-2222-2222-2222-222222222222',
        campoNoPermitido: true,
      })
      .expect(400);

    expect(service.create).not.toHaveBeenCalled();
  });

  it('expone filtros GET y respuesta JSON del servicio', async () => {
    const incidencias = [{ id: 'inc-1', codigo: 'INC-001', estado: 'abierta' }];
    service.findAll.mockResolvedValue(incidencias);

    await request(app.getHttpServer())
      .get('/incidencias')
      .query({
        empresaId: '11111111-1111-1111-1111-111111111111',
        estado: 'abierta',
        prioridad: 'alta',
        asignadaA: '22222222-2222-2222-2222-222222222222',
      })
      .expect(200)
      .expect(incidencias);

    expect(service.findAll).toHaveBeenCalledWith(
      '11111111-1111-1111-1111-111111111111',
      'abierta',
      'alta',
      '22222222-2222-2222-2222-222222222222',
    );
  });

  it('cancela por DELETE y devuelve contrato ok', async () => {
    service.remove.mockResolvedValue(undefined);

    await request(app.getHttpServer())
      .delete('/incidencias/inc-1')
      .query({ usuarioActorId: '22222222-2222-2222-2222-222222222222' })
      .expect(200)
      .expect({ ok: true });

    expect(service.remove).toHaveBeenCalledWith('inc-1', expect.objectContaining({
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    }));
  });
});
