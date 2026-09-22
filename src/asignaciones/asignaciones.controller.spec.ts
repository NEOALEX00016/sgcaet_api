import { Test, TestingModule } from '@nestjs/testing';
import { AsignacionesController } from './asignaciones.controller';
import { AsignacionesService } from './asignaciones.service';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';

describe('AsignacionesController', () => {
  let controller: AsignacionesController;
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const asignacionesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AsignacionesController],
      providers: [
        {
          provide: AsignacionesService,
          useValue: asignacionesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<AsignacionesController>(AsignacionesController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateAsignacionDto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      personaId: '33333333-3333-3333-3333-333333333333',
      fechaAsignacion: '2026-09-08T00:00:00.000Z',
      usuarioActorId: '22222222-2222-2222-2222-222222222222',
    };

    asignacionesServiceMock.create.mockResolvedValue({
      id: 'asg-1',
      ...dto,
      estado: 'borrador',
    });

    const result = await controller.create(dto, user);

    expect(asignacionesServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'asg-1', estado: 'borrador' });
  });
});
