import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  const usuariosServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: usuariosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateUsuarioDto = {
      correo: 'admin@empresa.com',
      nombres: 'Admin',
      apellidos: 'Tenant',
      contrasena: 'TestPassword123!',
    };

    usuariosServiceMock.create.mockResolvedValue({ id: '1', ...dto });

    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: dto.correo,
    };
    const result = await controller.create(dto, user);

    expect(usuariosServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: '1', correo: 'admin@empresa.com' });
  });
});
