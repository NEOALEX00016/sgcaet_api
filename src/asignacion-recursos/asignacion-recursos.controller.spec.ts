import { Test, TestingModule } from '@nestjs/testing';
import { AsignacionRecursosController } from './asignacion-recursos.controller';
import { AsignacionRecursosService } from './asignacion-recursos.service';
import { CreateAsignacionRecursoDto } from './dto/create-asignacion-recurso.dto';

describe('AsignacionRecursosController', () => {
  let controller: AsignacionRecursosController;
  const user = {
    userId: '44444444-4444-4444-4444-444444444444',
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
      controllers: [AsignacionRecursosController],
      providers: [
        {
          provide: AsignacionRecursosService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<AsignacionRecursosController>(
      AsignacionRecursosController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateAsignacionRecursoDto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'activo',
      activoId: '33333333-3333-3333-3333-333333333333',
      usuarioActorId: '44444444-4444-4444-4444-444444444444',
    };

    serviceMock.create.mockResolvedValue({
      id: 'res-1',
      ...dto,
      estaActivo: true,
    });

    const result = await controller.create(dto, user);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'res-1', tipoRecurso: 'activo' });
  });
});
