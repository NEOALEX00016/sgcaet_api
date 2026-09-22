import { Test, TestingModule } from '@nestjs/testing';
import { TiposNodoOrganizacionController } from './tipos-nodo-organizacion.controller';
import { TiposNodoOrganizacionService } from './tipos-nodo-organizacion.service';

describe('TiposNodoOrganizacionController', () => {
  let controller: TiposNodoOrganizacionController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TiposNodoOrganizacionController],
      providers: [
        {
          provide: TiposNodoOrganizacionService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<TiposNodoOrganizacionController>(TiposNodoOrganizacionController);
    jest.resetAllMocks();
  });

  it('propaga el usuario autenticado al crear', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    };
    const dto = {
      codigo: 'gerencia',
      nombreVisible: 'Gerencia',
    };

    await controller.create(dto, user);

    expect(service.create).toHaveBeenCalledWith(dto, user);
  });
});
