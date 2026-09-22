import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Usuario } from './entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('UsuariosService', () => {
  let service: UsuariosService;
  const usuariosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const bitacoraRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
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

    service = module.get<UsuariosService>(UsuariosService);
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear usuario y registrar bitacora', async () => {
    const dto = {
      correo: 'admin@empresa.com',
      nombres: 'Admin',
      apellidos: 'Tenant',
      contrasena: 'TestPassword123!',
    };

    const created = {
      id: 'usr-1',
      ...dto,
      nombreUsuario: 'admin',
      hashContrasena: 'hashed-password',
      estado: 'activo',
      esPropietarioPlataforma: false,
    };
    usuariosRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    usuariosRepositoryMock.create.mockImplementation((payload) => ({
      ...created,
      ...payload,
    }));
    usuariosRepositoryMock.create.mockReturnValue(created);
    usuariosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: dto.correo,
    });

    expect(usuariosRepositoryMock.create).toHaveBeenCalled();
    expect(usuariosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ hashContrasena: expect.any(String) }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'usr-1', correo: 'admin@empresa.com' });
    expect(result).not.toHaveProperty('hashContrasena');
  });

  it('debe rechazar crear usuario con correo duplicado en el tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: 'usr-existente',
      correo: 'admin@empresa.com',
    });

    await expect(
      service.create(
        {
          correo: 'admin@empresa.com',
          nombres: 'Admin',
          apellidos: 'Tenant',
          contrasena: 'TestPassword123!',
        },
        {
          userId: '22222222-2222-2222-2222-222222222222',
          empresaId: '11111111-1111-1111-1111-111111111111',
          correo: 'actor@empresa.com',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('debe rechazar crear usuario con nombre de usuario duplicado en el tenant', async () => {
    usuariosRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'usr-existente',
        nombreUsuario: 'admin',
      });

    await expect(
      service.create(
        {
          correo: 'nuevo@empresa.com',
          nombreUsuario: 'admin',
          nombres: 'Nuevo',
          apellidos: 'Usuario',
          contrasena: 'TestPassword123!',
        },
        {
          userId: '22222222-2222-2222-2222-222222222222',
          empresaId: '11111111-1111-1111-1111-111111111111',
          correo: 'actor@empresa.com',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza acceder a un usuario de otro tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('usuario-tenant-b', {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(usuariosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'usuario-tenant-b',
        empresaId: '11111111-1111-1111-1111-111111111111',
        deletedAt: expect.anything(),
      },
    });
  });

  it('permite conceder PlatformOwner solo cuando el actor ya es PlatformOwner', async () => {
    usuariosRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'actor-1',
        empresaId: 'tenant-1',
        esPropietarioPlataforma: true,
      })
      .mockResolvedValueOnce({
        id: 'target-1',
        empresaId: 'tenant-1',
        esPropietarioPlataforma: false,
      });
    usuariosRepositoryMock.save.mockImplementation(async (value) => value);
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.setPlatformOwner(
      'target-1',
      { esPropietarioPlataforma: true, motivo: 'Aprobacion humana DEC-001' },
      {
        userId: 'actor-1',
        empresaId: 'tenant-1',
        correo: 'owner@sgcaet.test',
      },
    );

    expect(result.esPropietarioPlataforma).toBe(true);
    expect(bitacoraRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        accion: 'USUARIOS_PLATFORM_OWNER_CONCEDER',
      }),
    );
  });

  it('rechaza conceder PlatformOwner cuando actor no es PlatformOwner', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValueOnce({
      id: 'actor-2',
      empresaId: 'tenant-1',
      esPropietarioPlataforma: false,
    });

    await expect(
      service.setPlatformOwner(
        'target-1',
        { esPropietarioPlataforma: true },
        {
          userId: 'actor-2',
          empresaId: 'tenant-1',
          correo: 'admin@tenant.test',
        },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
