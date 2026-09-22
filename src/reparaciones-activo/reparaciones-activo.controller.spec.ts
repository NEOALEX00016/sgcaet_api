import { Test, TestingModule } from '@nestjs/testing';
import { ReparacionesActivoController } from './reparaciones-activo.controller';
import { ReparacionesActivoService } from './reparaciones-activo.service';

describe('ReparacionesActivoController', () => {
  let controller: ReparacionesActivoController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReparacionesActivoController],
      providers: [
        { provide: ReparacionesActivoService, useValue: serviceMock },
      ],
    }).compile();

    controller = module.get<ReparacionesActivoController>(
      ReparacionesActivoController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
