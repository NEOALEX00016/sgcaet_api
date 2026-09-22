import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

describe('RolesController', () => {
  let controller: RolesController;
  const rolesServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: rolesServiceMock,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateRoleDto = {
      codigo: 'tenant_admin',
      nombre: 'Administrador Tenant',
    };

    rolesServiceMock.create.mockResolvedValue({ id: 'rol-1', ...dto });

    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    };
    const result = await controller.create(dto, user);

    expect(rolesServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'rol-1', codigo: 'tenant_admin' });
  });
});
