import { Test, TestingModule } from '@nestjs/testing';
import { DevolucionesController } from './devoluciones.controller';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';

describe('DevolucionesController', () => {
  let controller: DevolucionesController;
  const user = {
    userId: '33333333-3333-3333-3333-333333333333',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DevolucionesController],
      providers: [
        {
          provide: DevolucionesService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<DevolucionesController>(DevolucionesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateDevolucionDto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      asignacionId: '22222222-2222-2222-2222-222222222222',
      condicionActivo: 'correcto',
      usuarioActorId: '33333333-3333-3333-3333-333333333333',
    };

    serviceMock.create.mockResolvedValue({ id: 'dev-1', ...dto });

    const result = await controller.create(dto, user);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'dev-1', condicionActivo: 'correcto' });
  });
});
