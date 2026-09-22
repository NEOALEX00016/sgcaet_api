import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SolicitudesController } from '../src/solicitudes/solicitudes.controller';
import { SolicitudesService } from '../src/solicitudes/solicitudes.service';

describe('Solicitudes domain HTTP contract', () => {
  let app: INestApplication;
  const service = { createMixta: jest.fn(), findAdmin: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SolicitudesController],
      providers: [{ provide: SolicitudesService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
    jest.clearAllMocks();
  });

  afterEach(async () => app.close());

  it('expone solicitudes mixtas con grupo, padre y dominios separados', async () => {
    service.createMixta.mockResolvedValue({
      grupoId: 'group-1',
      solicitudPadreId: 'equipment-1',
      solicitudes: [
        { id: 'equipment-1', dominio: 'equipos', solicitudPadreId: 'equipment-1' },
        { id: 'telecom-1', dominio: 'telecom', solicitudPadreId: 'equipment-1' },
      ],
    });
    await request(app.getHttpServer())
      .post('/solicitudes/mixta')
      .send({ equipoRecursoTipo: 'laptop', telecomRecursoTipo: 'recarga_minutos' })
      .expect(201)
      .expect(({ body }) => {
        expect(body.solicitudes).toHaveLength(2);
        expect(body.solicitudes.map((item: { dominio: string }) => item.dominio)).toEqual(['equipos', 'telecom']);
      });
  });

  it('documenta el filtro administrativo por dominio', async () => {
    service.findAdmin.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20, totalPages: 1 });
    await request(app.getHttpServer()).get('/solicitudes?dominio=telecom&page=1&limit=20').expect(200);
    expect(service.findAdmin).toHaveBeenCalledWith(undefined, expect.objectContaining({ dominio: 'telecom', page: 1, limit: 20 }));
  });
});
