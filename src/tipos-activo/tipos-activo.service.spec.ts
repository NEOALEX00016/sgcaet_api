import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TiposActivoService } from './tipos-activo.service';
import { TiposActivo } from './entities/tipos-activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Activo } from '../activos/entities/activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { NotFoundException } from '@nestjs/common';

describe('TiposActivoService', () => {
  let service: TiposActivoService;
  const tiposRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const activosRepositoryMock = { count: jest.fn() };
  const categoriasRepositoryMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposActivoService,
        {
          provide: getRepositoryToken(TiposActivo),
          useValue: tiposRepositoryMock,
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
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
        },
        {
          provide: getRepositoryToken(CategoriaEquipo),
          useValue: categoriasRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<TiposActivoService>(TiposActivoService);
    jest.clearAllMocks();
  });

  it('debe crear tipo de activo y registrar bitacora', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      codigo: 'LAPTOP',
      nombre: 'Laptop',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    categoriasRepositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    const created = { id: 'tip-1', ...dto, estaActivo: true };
    tiposRepositoryMock.create.mockReturnValue(created);
    tiposRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'tip-1', codigo: 'LAPTOP' });
    expect(tiposRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        codigo: 'laptop',
        nombre: 'Laptop',
        empresaId: user.empresaId,
        estaActivo: true,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza leer un tipo de activo de otro tenant', async () => {
    tiposRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('tipo-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrado');
    expect(tiposRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'tipo-tenant-b', empresaId: 'tenant-a' },
    });
  });

  it('rechaza create cuando la categoria no pertenece al tenant', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    categoriasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          codigo: 'laptop',
          nombre: 'Laptop',
          categoriaEquipoId: 'cat-tenant-b',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('desactiva tipo en remove cuando no tiene activos asociados', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const tipo = {
      id: 'tip-1',
      empresaId: user.empresaId,
      estaActivo: true,
    };

    tiposRepositoryMock.findOne.mockResolvedValue(tipo);
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    activosRepositoryMock.count.mockResolvedValue(0);
    tiposRepositoryMock.save.mockResolvedValue({ ...tipo, estaActivo: false });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('tip-1', user);

    expect(tiposRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'tip-1',
        estaActivo: false,
      }),
    );
  });
});
