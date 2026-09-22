import { Test, TestingModule } from '@nestjs/testing';
import { LineasTelefonicasController } from './lineas-telefonicas.controller';
import { LineasTelefonicasService } from './lineas-telefonicas.service';
import { CreateLineaTelefonicaDto } from './dto/create-linea-telefonica.dto';

describe('LineasTelefonicasController', () => {
  let controller: LineasTelefonicasController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    cambiarLineaAsignada: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LineasTelefonicasController],
      providers: [
        {
          provide: LineasTelefonicasService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<LineasTelefonicasController>(
      LineasTelefonicasController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateLineaTelefonicaDto = {
      numero: '8090001111',
    };
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'test@example.com',
    };

    serviceMock.create.mockResolvedValue({ id: 'lin-1', ...dto });

    const result = await controller.create(dto, user);

    expect(serviceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'lin-1', numero: '8090001111' });
  });

  it('debe delegar findAll con filtros normalizados', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'test@example.com',
    };
    serviceMock.findAll.mockResolvedValue([{ id: 'lin-1' }]);

    const result = await controller.findAll(user, 'activa', 'true', ' 809 ');

    expect(result).toEqual([{ id: 'lin-1' }]);
    expect(serviceMock.findAll).toHaveBeenCalledWith(user, {
      estado: 'activa',
      estaActiva: true,
      search: '809',
    });
  });

  it('debe delegar trazabilidad persona-linea con filtros normalizados', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'test@example.com',
    };
    serviceMock.getPersonaLineaTrace = jest.fn().mockResolvedValue([{ asignacionId: 'asg-1' }]);

    const result = await controller.getPersonaLineaTrace(
      user,
      ' per-1 ',
      ' linea-1 ',
      'false',
    );

    expect(result).toEqual([{ asignacionId: 'asg-1' }]);
    expect(serviceMock.getPersonaLineaTrace).toHaveBeenCalledWith(user, {
      personaId: 'per-1',
      lineaTelefonicaId: 'linea-1',
      soloActivas: false,
    });
  });
});
