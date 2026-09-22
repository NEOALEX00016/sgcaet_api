import { Test, TestingModule } from '@nestjs/testing';
import { ActivosController } from './activos.controller';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';

describe('ActivosController', () => {
  let controller: ActivosController;
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const activosServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivosController],
      providers: [
        {
          provide: ActivosService,
          useValue: activosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<ActivosController>(ActivosController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateActivoDto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      tipoActivoId: '33333333-3333-3333-3333-333333333333',
      codigoActivo: 'LAP-001',
      nombre: 'Laptop Operaciones',
      usuarioActorId: '22222222-2222-2222-2222-222222222222',
    };

    activosServiceMock.create.mockResolvedValue({ id: 'act-1', ...dto });

    const result = await controller.create(dto, user);

    expect(activosServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'act-1', codigoActivo: 'LAP-001' });
  });
});
