import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TiposNodoOrganizacionService } from './tipos-nodo-organizacion.service';
import { TiposNodoOrganizacion } from './entities/tipos-nodo-organizacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('TiposNodoOrganizacionService', () => {
  let service: TiposNodoOrganizacionService;

  const tiposRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TiposNodoOrganizacionService,
        {
          provide: getRepositoryToken(TiposNodoOrganizacion),
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
      ],
    }).compile();

    service = module.get<TiposNodoOrganizacionService>(TiposNodoOrganizacionService);
    jest.resetAllMocks();
  });

  it('crea tipo de nodo tenant y registra bitacora', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    tiposRepositoryMock.findOne.mockResolvedValue(null);

    const created = {
      id: 'tipo-1',
      empresaId: user.empresaId,
      codigo: 'gerencia',
      nombreVisible: 'Gerencia',
      esSistema: false,
      estaActivo: true,
    };
    tiposRepositoryMock.create.mockReturnValue(created);
    tiposRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(
      {
        codigo: '  gerencia  ',
        nombreVisible: '  Gerencia  ',
      },
      user,
    );

    expect(result).toMatchObject({
      id: 'tipo-1',
      codigo: 'gerencia',
      nombreVisible: 'Gerencia',
    });
    expect(tiposRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId, codigo: 'gerencia' },
    });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza crear tipo duplicado por tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    tiposRepositoryMock.findOne.mockResolvedValue({ id: 'tipo-existente' });

    await expect(
      service.create({ codigo: 'gerencia', nombreVisible: 'Gerencia' }, user),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lista catalogo global + tenant del usuario', async () => {
    tiposRepositoryMock.find.mockResolvedValue([{ id: 'tipo-1' }, { id: 'tipo-2' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(2);
    expect(tiposRepositoryMock.find).toHaveBeenCalledTimes(1);
    const [query] = tiposRepositoryMock.find.mock.calls[0] as [
      {
        where: Array<{ empresaId: unknown }>;
        order: Record<string, string>;
      },
    ];
    expect(query.where[0].empresaId).toBe(user.empresaId);
    expect(query.order).toEqual({ esSistema: 'DESC', nombreVisible: 'ASC' });
  });

  it('rechaza actualizar tipo global del sistema', async () => {
    tiposRepositoryMock.findOne.mockResolvedValue({
      id: 'tipo-global',
      empresaId: null,
      esSistema: true,
      codigo: 'empresa',
      nombreVisible: 'Empresa',
    });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(
      service.update(
        'tipo-global',
        {
          nombreVisible: 'Empresa corporativa',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechaza acceso a tipo de nodo de otro tenant', async () => {
    tiposRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.findOne('tipo-tenant-b', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
