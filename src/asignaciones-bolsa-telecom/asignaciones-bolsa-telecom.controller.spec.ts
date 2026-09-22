import { Test, TestingModule } from '@nestjs/testing';
import { AsignacionesBolsaTelecomController } from './asignaciones-bolsa-telecom.controller';
import { AsignacionesBolsaTelecomService } from './asignaciones-bolsa-telecom.service';

describe('AsignacionesBolsaTelecomController', () => {
  let controller: AsignacionesBolsaTelecomController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsignacionesBolsaTelecomController],
      providers: [
        { provide: AsignacionesBolsaTelecomService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<AsignacionesBolsaTelecomController>(
      AsignacionesBolsaTelecomController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar findAll con filtros normalizados', async () => {
    const user = {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'test@example.com',
    };
    serviceMock.findAll.mockResolvedValue([{ id: 'abt-1' }]);

    const result = await controller.findAll(
      user,
      ' linea-1 ',
      'activa',
      'vigente',
    );

    expect(result).toEqual([{ id: 'abt-1' }]);
    expect(serviceMock.findAll).toHaveBeenCalledWith(user, {
      lineaTelefonicaId: 'linea-1',
      estado: 'activa',
      vigencia: 'vigente',
    });
  });
});
