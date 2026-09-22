import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Rol } from './entities/role.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('RolesService', () => {
  let service: RolesService;
  const rolesRepositoryMock = {
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
        RolesService,
        {
          provide: getRepositoryToken(Rol),
          useValue: rolesRepositoryMock,
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

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear rol y registrar bitacora', async () => {
    const dto = {
      codigo: 'tenant_admin',
      nombre: 'Administrador Tenant',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
    });
    const created = {
      id: 'rol-1',
      ...dto,
      codigo: 'tenant_admin',
      esSistema: false,
      estaActivo: true,
    };
    rolesRepositoryMock.findOne.mockResolvedValueOnce(null);
    rolesRepositoryMock.create.mockReturnValue(created);
    rolesRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    });

    expect(rolesRepositoryMock.create).toHaveBeenCalledWith({
      codigo: 'tenant_admin',
      nombre: 'Administrador Tenant',
      empresaId: '11111111-1111-1111-1111-111111111111',
      esSistema: false,
      estaActivo: true,
    });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'rol-1', codigo: 'tenant_admin' });
  });

  it('rechaza crear rol con codigo duplicado por tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
    });
    rolesRepositoryMock.findOne.mockResolvedValue({
      id: 'rol-existente',
      codigo: 'tenant_admin',
    });

    await expect(
      service.create(
        {
          codigo: 'TENANT_ADMIN',
          nombre: 'Administrador Tenant',
        },
        {
          userId: '22222222-2222-2222-2222-222222222222',
          empresaId: '11111111-1111-1111-1111-111111111111',
          correo: 'admin@empresa.com',
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza actualizar rol de sistema', async () => {
    rolesRepositoryMock.findOne.mockResolvedValue({
      id: 'rol-sistema',
      empresaId: '11111111-1111-1111-1111-111111111111',
      codigo: 'seguridad_admin',
      nombre: 'Seguridad Admin',
      esSistema: true,
      estaActivo: true,
    });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
    });

    await expect(
      service.update(
        'rol-sistema',
        { nombre: 'Nuevo nombre' },
        {
          userId: '22222222-2222-2222-2222-222222222222',
          empresaId: '11111111-1111-1111-1111-111111111111',
          correo: 'admin@empresa.com',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza acceder a un rol de otro tenant', async () => {
    rolesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('rol-tenant-b', {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(rolesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'rol-tenant-b',
        empresaId: '11111111-1111-1111-1111-111111111111',
      },
    });
  });
});
