import { Test, TestingModule } from '@nestjs/testing';
import { RolPermisosController } from './rol-permisos.controller';
import { RolPermisosService } from './rol-permisos.service';

describe('RolPermisosController', () => {
  let controller: RolPermisosController;
  const rolPermisosServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolPermisosController],
      providers: [
        {
          provide: RolPermisosService,
          useValue: rolPermisosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<RolPermisosController>(RolPermisosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
