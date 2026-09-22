import { Test, TestingModule } from '@nestjs/testing';
import { BolsasTelecomController } from './bolsas-telecom.controller';
import { BolsasTelecomService } from './bolsas-telecom.service';

describe('BolsasTelecomController', () => {
  let controller: BolsasTelecomController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BolsasTelecomController],
      providers: [{ provide: BolsasTelecomService, useValue: serviceMock }],
    }).compile();

    controller = module.get<BolsasTelecomController>(BolsasTelecomController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
