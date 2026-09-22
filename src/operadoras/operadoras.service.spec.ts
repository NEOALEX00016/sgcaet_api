import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperadorasService } from './operadoras.service';
import { Operadora } from './entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('OperadorasService', () => {
  let service: OperadorasService;
  const operadorasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperadorasService,
        {
          provide: getRepositoryToken(Operadora),
          useValue: operadorasRepositoryMock,
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

    service = module.get<OperadorasService>(OperadorasService);
    jest.clearAllMocks();
  });

  it('debe crear operadora y registrar bitacora', async () => {
    const dto = {
      codigo: 'ALTICE',
      nombre: 'Altice Dominicana',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    const created = { id: 'ope-1', ...dto, pais: 'DO', estaActiva: true };
    operadorasRepositoryMock.create.mockReturnValue(created);
    operadorasRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'ope-1', codigo: 'ALTICE' });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza acceso a una operadora de otro tenant', async () => {
    operadorasRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('ope-tenant-b', user)).rejects.toThrow(
      'no encontrada',
    );
    expect(operadorasRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'ope-tenant-b', empresaId: user.empresaId },
    });
  });

  it('lista operadoras solo del tenant autenticado', async () => {
    operadorasRepositoryMock.find.mockResolvedValue([{ id: 'ope-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(operadorasRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('desactiva operadora en remove (sin borrado fisico)', async () => {
    const operadora = {
      id: 'ope-1',
      empresaId: user.empresaId,
      estaActiva: true,
      nombre: 'Altice',
      pais: 'DO',
    };

    operadorasRepositoryMock.findOne.mockResolvedValue(operadora);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    operadorasRepositoryMock.save.mockResolvedValue({
      ...operadora,
      estaActiva: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('ope-1', user);

    expect(operadorasRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ope-1',
        estaActiva: false,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
