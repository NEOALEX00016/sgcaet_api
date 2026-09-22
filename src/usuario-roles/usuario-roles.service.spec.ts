import { Test, TestingModule } from '@nestjs/testing';
import { UsuarioRolesService } from './usuario-roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsuarioRol } from './entities/usuario-role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/role.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';

describe('UsuarioRolesService', () => {
  let service: UsuarioRolesService;
  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const usuariosRepositoryMock = { findOne: jest.fn() };
  const rolesRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const rolPermisosRepositoryMock = { find: jest.fn() };
  const permisosRepositoryMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuarioRolesService,
        {
          provide: getRepositoryToken(UsuarioRol),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Rol),
          useValue: rolesRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        {
          provide: getRepositoryToken(RolPermiso),
          useValue: rolPermisosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Permiso),
          useValue: permisosRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<UsuarioRolesService>(UsuarioRolesService);
    jest.resetAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una asignacion de rol a usuario', async () => {
    const dto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      usuarioId: '22222222-2222-2222-2222-222222222222',
      rolId: '33333333-3333-3333-3333-333333333333',
      usuarioActorId: '44444444-4444-4444-4444-444444444444',
    };

    const created = { id: 'xyz', ...dto, asignadoEn: new Date() };
    usuariosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.usuarioId })
      .mockResolvedValueOnce({
        id: dto.usuarioActorId,
        esPropietarioPlataforma: true,
      });
    rolesRepositoryMock.findOne.mockResolvedValue({ id: dto.rolId });
    repositoryMock.findOne.mockResolvedValueOnce(null);
    repositoryMock.create.mockReturnValue(created);
    repositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-2' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.create(dto, {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: dto.empresaId,
      correo: 'admin@empresa.com',
    });

    expect(repositoryMock.create).toHaveBeenCalled();
    expect(repositoryMock.save).toHaveBeenCalledWith(created);
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'xyz' });
  });

  it('debe ser idempotente al crear asignacion usuario-rol existente', async () => {
    const dto = {
      usuarioId: '22222222-2222-2222-2222-222222222222',
      rolId: '33333333-3333-3333-3333-333333333333',
    };

    usuariosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.usuarioId })
      .mockResolvedValueOnce({
        id: '44444444-4444-4444-4444-444444444444',
        esPropietarioPlataforma: true,
      });
    rolesRepositoryMock.findOne.mockResolvedValue({ id: dto.rolId });
    repositoryMock.findOne.mockResolvedValueOnce({
      id: 'existente-ur-1',
      empresaId: '11111111-1111-1111-1111-111111111111',
      usuarioId: dto.usuarioId,
      rolId: dto.rolId,
    });

    const result = await service.create(dto, {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    });

    expect(repositoryMock.create).not.toHaveBeenCalled();
    expect(repositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'existente-ur-1' });
  });

  it('debe ser idempotente al revocar asignacion inexistente', async () => {
    repositoryMock.findOne.mockResolvedValueOnce(null);

    await service.remove('no-existe', {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    });

    expect(repositoryMock.delete).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).not.toHaveBeenCalled();
  });
});
