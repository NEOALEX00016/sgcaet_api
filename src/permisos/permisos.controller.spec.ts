import { Test, TestingModule } from '@nestjs/testing';
import { PermisosController } from './permisos.controller';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';

describe('PermisosController', () => {
  let controller: PermisosController;
  const permisosServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermisosController],
      providers: [
        {
          provide: PermisosService,
          useValue: permisosServiceMock,
        },
      ],
    }).compile();

    controller = module.get<PermisosController>(PermisosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreatePermisoDto = {
      codigo: 'activos.ver',
      moduloClave: 'activos',
      recursoClave: 'activos',
      accionClave: 'ver',
    };

    permisosServiceMock.create.mockResolvedValue({ id: 'perm-1', ...dto });

    const user = {
      userId: '11111111-1111-1111-1111-111111111111',
      empresaId: '22222222-2222-2222-2222-222222222222',
      correo: 'admin@empresa.com',
    };
    const result = await controller.create(dto, user);

    expect(permisosServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: 'perm-1', codigo: 'activos.ver' });
  });

  it('debe delegar catalogo agrupado al servicio', async () => {
    const user = {
      userId: '11111111-1111-1111-1111-111111111111',
      empresaId: '22222222-2222-2222-2222-222222222222',
      correo: 'admin@empresa.com',
    };
    permisosServiceMock.findCatalogoAgrupado = jest
      .fn()
      .mockResolvedValue([{ moduloClave: 'activos', recursos: [] }]);

    const result = await controller.findCatalogoAgrupado(user);

    expect(permisosServiceMock.findCatalogoAgrupado).toHaveBeenCalledWith(user);
    expect(result).toEqual([{ moduloClave: 'activos', recursos: [] }]);
  });
});
