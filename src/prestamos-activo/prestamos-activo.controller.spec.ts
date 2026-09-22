import { Test, TestingModule } from '@nestjs/testing';
import { PrestamosActivoController } from './prestamos-activo.controller';
import { PrestamosActivoService } from './prestamos-activo.service';

describe('PrestamosActivoController', () => {
  let controller: PrestamosActivoController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrestamosActivoController],
      providers: [{ provide: PrestamosActivoService, useValue: serviceMock }],
    }).compile();

    controller = module.get<PrestamosActivoController>(
      PrestamosActivoController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
