import { Test, TestingModule } from '@nestjs/testing';
import { PermisosService } from './permisos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Permiso } from './entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PermisosService', () => {
  let service: PermisosService;
  const permisosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermisosService,
        {
          provide: getRepositoryToken(Permiso),
          useValue: permisosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<PermisosService>(PermisosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear permiso y registrar bitacora', async () => {
    const dto = {
      codigo: 'activos.ver',
      moduloClave: 'activos',
      recursoClave: 'activos',
      accionClave: 'ver',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    });
    const created = {
      id: 'perm-1',
      ...dto,
      codigo: 'activos.ver',
      moduloClave: 'activos',
      recursoClave: 'activos',
      accionClave: 'ver',
    };
    permisosRepositoryMock.findOne.mockResolvedValueOnce(null);
    permisosRepositoryMock.create.mockReturnValue(created);
    permisosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, {
      userId: '11111111-1111-1111-1111-111111111111',
      empresaId: '22222222-2222-2222-2222-222222222222',
      correo: 'admin@empresa.com',
    });

    expect(permisosRepositoryMock.create).toHaveBeenCalledWith({
      codigo: 'activos.ver',
      moduloClave: 'activos',
      recursoClave: 'activos',
      accionClave: 'ver',
    });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'perm-1', codigo: 'activos.ver' });
  });

  it('debe devolver catalogo agrupado por modulo y recurso', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
    });
    permisosRepositoryMock.find.mockResolvedValue([
      {
        id: 'p-1',
        codigo: 'activos.ver',
        moduloClave: 'activos',
        recursoClave: 'activos',
        accionClave: 'ver',
      },
      {
        id: 'p-2',
        codigo: 'activos.editar',
        moduloClave: 'activos',
        recursoClave: 'activos',
        accionClave: 'editar',
      },
      {
        id: 'p-3',
        codigo: 'telecom.ver',
        moduloClave: 'telecom',
        recursoClave: 'lineas',
        accionClave: 'ver',
      },
    ]);

    const result = await service.findCatalogoAgrupado({
      userId: '11111111-1111-1111-1111-111111111111',
      empresaId: '22222222-2222-2222-2222-222222222222',
      correo: 'admin@empresa.com',
    });

    expect(result).toEqual([
      {
        moduloClave: 'activos',
        recursos: [
          {
            recursoClave: 'activos',
            permisos: [
              {
                id: 'p-1',
                codigo: 'activos.ver',
                accionClave: 'ver',
                descripcion: undefined,
              },
              {
                id: 'p-2',
                codigo: 'activos.editar',
                accionClave: 'editar',
                descripcion: undefined,
              },
            ],
          },
        ],
      },
      {
        moduloClave: 'telecom',
        recursos: [
          {
            recursoClave: 'lineas',
            permisos: [
              {
                id: 'p-3',
                codigo: 'telecom.ver',
                accionClave: 'ver',
                descripcion: undefined,
              },
            ],
          },
        ],
      },
    ]);
  });
});
