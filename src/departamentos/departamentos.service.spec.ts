import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DepartamentosService } from './departamentos.service';
import { Departamento } from './entities/departamento.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('DepartamentosService', () => {
  let service: DepartamentosService;
  const departamentosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartamentosService,
        {
          provide: getRepositoryToken(Departamento),
          useValue: departamentosRepositoryMock,
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

    service = module.get<DepartamentosService>(DepartamentosService);
    jest.clearAllMocks();
  });

  it('debe crear departamento y registrar bitacora', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      codigo: 'DEP-TI',
      nombre: 'Tecnologia',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    const created = { id: 'dep-1', ...dto, estaActivo: true };
    departamentosRepositoryMock.create.mockReturnValue(created);
    departamentosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'dep-1', codigo: 'DEP-TI' });
    expect(departamentosRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        estaActivo: true,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza leer un departamento de otro tenant', async () => {
    departamentosRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('dep-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrado');
    expect(departamentosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'dep-tenant-b', empresaId: 'tenant-a' },
    });
  });

  it('desactiva el departamento en remove (sin borrado fisico)', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const departamento = {
      id: 'dep-1',
      empresaId: user.empresaId,
      estaActivo: true,
    };

    departamentosRepositoryMock.findOne.mockResolvedValue(departamento);
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    departamentosRepositoryMock.save.mockResolvedValue({
      ...departamento,
      estaActivo: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('dep-1', user);

    expect(departamentosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dep-1',
        estaActivo: false,
      }),
    );
  });
});
