import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioRolesController } from './usuario-roles.controller';
import { UsuarioRolesService } from './usuario-roles.service';

describe('UsuarioRolesController', () => {
  let controller: UsuarioRolesController;
  const usuarioRolesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuarioRolesController],
      providers: [
        {
          provide: UsuarioRolesService,
          useValue: usuarioRolesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsuarioRolesController>(UsuarioRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
