import { Test, TestingModule } from '@nestjs/testing';
import { CambiosEquipoController } from './cambios-equipo.controller';
import { CambiosEquipoService } from './cambios-equipo.service';
import { CreateCambioEquipoDto } from './dto/create-cambio-equipo.dto';

describe('CambiosEquipoController', () => {
  let controller: CambiosEquipoController;
  const user = {
    userId: '55555555-5555-5555-5555-555555555555',
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
      controllers: [CambiosEquipoController],
      providers: [
        {
          provide: CambiosEquipoService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<CambiosEquipoController>(CambiosEquipoController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateCambioEquipoDto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      asignacionId: '22222222-2222-2222-2222-222222222222',
      activoAnteriorId: '33333333-3333-3333-3333-333333333333',
      activoNuevoId: '44444444-4444-4444-4444-444444444444',
      motivo: 'Reemplazo por mantenimiento',
      usuarioActorId: '55555555-5555-5555-5555-555555555555',
    };

    serviceMock.create.mockResolvedValue({ id: 'cam-1', ...dto });

    const result = await controller.create(dto, user);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({
      id: 'cam-1',
      activoNuevoId: dto.activoNuevoId,
    });
  });
});
