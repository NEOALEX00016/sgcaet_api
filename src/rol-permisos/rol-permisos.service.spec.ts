import { Test, TestingModule } from '@nestjs/testing';
import { RolPermisosService } from './rol-permisos.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RolPermiso } from './entities/rol-permiso.entity';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

describe('RolPermisosService', () => {
  let service: RolPermisosService;
  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    delete: jest.fn(),
  };

  const rolesRepositoryMock = { findOne: jest.fn(), find: jest.fn() };
  const permisosRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const usuarioRolesRepositoryMock = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolPermisosService,
        {
          provide: getRepositoryToken(RolPermiso),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(Rol),
          useValue: rolesRepositoryMock,
        },
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
        {
          provide: getRepositoryToken(UsuarioRol),
          useValue: usuarioRolesRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<RolPermisosService>(RolPermisosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear una asignacion de permiso a rol', async () => {
    const dto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      rolId: '22222222-2222-2222-2222-222222222222',
      permisoId: '33333333-3333-3333-3333-333333333333',
      usuarioActorId: '44444444-4444-4444-4444-444444444444',
    };

    const created = { id: 'abc', ...dto, otorgadoEn: new Date() };
    rolesRepositoryMock.findOne.mockResolvedValue({ id: dto.rolId });
    repositoryMock.findOne.mockResolvedValueOnce(null);
    usuarioRolesRepositoryMock.find.mockResolvedValue([{ rolId: 'rol-admin' }]);
    repositoryMock.find.mockResolvedValue([{ permisoId: 'permiso-seguridad' }]);
    permisosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.permisoId })
      .mockResolvedValueOnce({
        id: 'permiso-seguridad',
        codigo: 'seguridad.permisos.gestionar',
      });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: dto.usuarioActorId,
      esPropietarioPlataforma: false,
    });
    repositoryMock.create.mockReturnValue(created);
    repositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: dto.empresaId,
      correo: 'admin@empresa.com',
    });

    expect(repositoryMock.create).toHaveBeenCalled();
    expect(repositoryMock.save).toHaveBeenCalledWith(created);
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'abc' });
  });

  it('debe ser idempotente al crear una asignacion existente', async () => {
    const dto = {
      rolId: '22222222-2222-2222-2222-222222222222',
      permisoId: '33333333-3333-3333-3333-333333333333',
    };

    rolesRepositoryMock.findOne.mockResolvedValue({ id: dto.rolId });
    repositoryMock.findOne.mockResolvedValueOnce({
      id: 'existente-1',
      empresaId: '11111111-1111-1111-1111-111111111111',
      rolId: dto.rolId,
      permisoId: dto.permisoId,
    });
    permisosRepositoryMock.findOne.mockResolvedValueOnce({ id: dto.permisoId });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '44444444-4444-4444-4444-444444444444',
      esPropietarioPlataforma: true,
    });

    const result = await service.create(dto, {
      userId: '44444444-4444-4444-4444-444444444444',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    });

    expect(repositoryMock.create).not.toHaveBeenCalled();
    expect(repositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).not.toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'existente-1' });
  });

  it('debe ser idempotente al revocar una asignacion inexistente', async () => {
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
