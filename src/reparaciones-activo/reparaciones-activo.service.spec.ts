import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ReparacionesActivoService } from './reparaciones-activo.service';
import { ReparacionActivo } from './entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('ReparacionesActivoService', () => {
  let service: ReparacionesActivoService;
  const user = {
    userId: '33333333-3333-3333-3333-333333333333',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const reparacionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const activosRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReparacionesActivoService,
        {
          provide: getRepositoryToken(ReparacionActivo),
          useValue: reparacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
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

    service = module.get<ReparacionesActivoService>(ReparacionesActivoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear reparacion y registrar bitacora', async () => {
    const dto = {
      activoId: '22222222-2222-2222-2222-222222222222',
      tipoServicio: 'reparacion',
      diagnostico: 'Cambio de disco',
      fechaIngreso: '2026-09-08T10:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId });
    const creada = {
      id: 'rep-1',
      ...dto,
      estado: 'abierta',
      fechaIngreso: new Date(dto.fechaIngreso),
    };
    reparacionesRepositoryMock.create.mockReturnValue(creada);
    reparacionesRepositoryMock.save.mockResolvedValue(creada);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'rep-1', estado: 'abierta' });
  });

  it('debe rechazar fecha de salida anterior a fecha de ingreso', async () => {
    const dto = {
      activoId: '22222222-2222-2222-2222-222222222222',
      tipoServicio: 'reparacion',
      diagnostico: 'Cambio de disco',
      fechaIngreso: '2026-09-08T10:00:00.000Z',
      fechaSalida: '2026-09-07T10:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId });

    await expect(service.create(dto as any, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debe cerrar reparacion con resultado y fecha de salida valida', async () => {
    const actual = {
      id: 'rep-2',
      empresaId: user.empresaId,
      activoId: 'activo-1',
      estado: 'en_proceso',
      resultado: undefined,
      fechaIngreso: new Date('2026-09-08T10:00:00.000Z'),
      fechaSalida: undefined,
      moneda: 'USD',
    };

    reparacionesRepositoryMock.findOne.mockResolvedValue(actual);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    reparacionesRepositoryMock.merge.mockReturnValue({
      ...actual,
      estado: 'cerrada',
      resultado: 'resuelto',
      fechaSalida: new Date('2026-09-09T10:00:00.000Z'),
    });
    reparacionesRepositoryMock.save.mockResolvedValue({
      ...actual,
      estado: 'cerrada',
      resultado: 'resuelto',
      fechaSalida: new Date('2026-09-09T10:00:00.000Z'),
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-2' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.update(
      'rep-2',
      {
        estado: 'cerrada',
        resultado: 'resuelto',
        fechaSalida: '2026-09-09T10:00:00.000Z',
      },
      user,
    );

    expect(result.estado).toBe('cerrada');
    expect(result.resultado).toBe('resuelto');
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
