import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlanesTelefonicosService } from './planes-telefonicos.service';
import { PlanesTelefonico } from './entities/planes-telefonico.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PlanesTelefonicosService', () => {
  let service: PlanesTelefonicosService;
  const planesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const operadorasRepositoryMock = { findOne: jest.fn() };
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
        PlanesTelefonicosService,
        {
          provide: getRepositoryToken(PlanesTelefonico),
          useValue: planesRepositoryMock,
        },
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

    service = module.get<PlanesTelefonicosService>(PlanesTelefonicosService);
    jest.clearAllMocks();
  });

  it('debe crear plan y registrar bitacora', async () => {
    const dto = {
      operadoraId: '33333333-3333-3333-3333-333333333333',
      codigo: 'PLAN-BASE',
      nombre: 'Plan Base',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    operadorasRepositoryMock.findOne.mockResolvedValue({
      id: dto.operadoraId,
      estaActiva: true,
    });
    const created = { id: 'pla-1', ...dto, moneda: 'DOP', estaActivo: true };
    planesRepositoryMock.create.mockReturnValue(created);
    planesRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'pla-1', codigo: 'PLAN-BASE' });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza acceso a un plan de otro tenant', async () => {
    planesRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('plan-tenant-b', user)).rejects.toThrow(
      'no encontrado',
    );
  });

  it('lista planes solo del tenant autenticado', async () => {
    planesRepositoryMock.find.mockResolvedValue([{ id: 'plan-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(planesRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('rechaza create cuando la operadora no pertenece al tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    operadorasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          operadoraId: 'operadora-tenant-b',
          codigo: 'plan-a',
          nombre: 'Plan A',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza create cuando costo mensual es negativo', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    operadorasRepositoryMock.findOne.mockResolvedValue({
      id: 'ope-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });

    await expect(
      service.create(
        {
          operadoraId: 'ope-1',
          codigo: 'plan-a',
          nombre: 'Plan A',
          costoMensual: '-10.00',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('desactiva plan en remove (sin borrado fisico)', async () => {
    const plan = {
      id: 'plan-1',
      empresaId: user.empresaId,
      operadoraId: 'ope-1',
      estaActivo: true,
    };

    planesRepositoryMock.findOne.mockResolvedValue(plan);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    planesRepositoryMock.save.mockResolvedValue({
      ...plan,
      estaActivo: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('plan-1', user);

    expect(planesRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'plan-1',
        estaActivo: false,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
