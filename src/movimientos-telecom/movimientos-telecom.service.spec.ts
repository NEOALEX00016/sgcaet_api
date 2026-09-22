import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { MovimientosTelecomService } from './movimientos-telecom.service';
import { MovimientosTelecom } from './entities/movimientos-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('MovimientosTelecomService', () => {
  let service: MovimientosTelecomService;
  const movimientosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const bolsasRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const queryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovimientosTelecomService,
        {
          provide: getRepositoryToken(MovimientosTelecom),
          useValue: movimientosRepositoryMock,
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
        },
        {
          provide: getRepositoryToken(BolsaTelecom),
          useValue: bolsasRepositoryMock,
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

    service = module.get<MovimientosTelecomService>(MovimientosTelecomService);
    jest.clearAllMocks();
    movimientosRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
    queryBuilderMock.where.mockReturnThis();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
    queryBuilderMock.addOrderBy.mockReturnThis();
  });

  it('rechaza movimiento sin linea ni bolsa', async () => {
    const dto = {
      tipoMovimiento: 'consumo',
      cantidad: '1',
      unidad: 'gb',
    };
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza acceso a un movimiento de otro tenant', async () => {
    movimientosRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('mov-tenant-b', user)).rejects.toThrow(
      'no encontrado',
    );
  });

  it('reutiliza idempotencia cuando el payload coincide', async () => {
    const dto = {
      lineaTelefonicaId: 'linea-1',
      tipoMovimiento: 'consumo',
      cantidad: '1',
      unidad: 'gb',
      claveIdempotencia: 'idem-1',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: 'linea-1',
      empresaId: user.empresaId,
    });
    movimientosRepositoryMock.findOne.mockResolvedValue({
      id: 'mov-1',
      empresaId: user.empresaId,
      lineaTelefonicaId: 'linea-1',
      bolsaTelecomId: null,
      tipoMovimiento: 'consumo',
      cantidad: '1',
      unidad: 'gb',
      claveIdempotencia: 'idem-1',
    });

    const result = await service.create(dto as never, user);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'mov-1',
        claveIdempotencia: 'idem-1',
      }),
    );
    expect(movimientosRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('rechaza reutilizacion idempotente con payload distinto', async () => {
    const dto = {
      lineaTelefonicaId: 'linea-1',
      tipoMovimiento: 'consumo',
      cantidad: '2',
      unidad: 'gb',
      claveIdempotencia: 'idem-1',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: 'linea-1',
      empresaId: user.empresaId,
    });
    movimientosRepositoryMock.findOne.mockResolvedValue({
      id: 'mov-1',
      empresaId: user.empresaId,
      lineaTelefonicaId: 'linea-1',
      bolsaTelecomId: null,
      tipoMovimiento: 'consumo',
      cantidad: '1',
      unidad: 'gb',
      claveIdempotencia: 'idem-1',
    });

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('findAll aplica filtros operativos de movimientos telecom', async () => {
    queryBuilderMock.getMany.mockResolvedValue([{ id: 'mov-1' }]);

    const result = await service.findAll(user, {
      lineaTelefonicaId: 'linea-1',
      bolsaTelecomId: 'bolsa-1',
      tipoMovimiento: 'consumo',
      claveIdempotencia: 'idem-1',
      referenciaExterna: 'ref-1',
      ocurridoDesde: '2026-01-01T00:00:00.000Z',
      ocurridoHasta: '2026-12-31T23:59:59.000Z',
    });

    expect(result).toEqual([{ id: 'mov-1' }]);
    expect(movimientosRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
      'movimiento',
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'movimiento.linea_telefonica_id = :lineaTelefonicaId',
      { lineaTelefonicaId: 'linea-1' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'movimiento.bolsa_telecom_id = :bolsaTelecomId',
      { bolsaTelecomId: 'bolsa-1' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'movimiento.clave_idempotencia = :claveIdempotencia',
      { claveIdempotencia: 'idem-1' },
    );
  });

  it('findAll sin filtros mantiene aislamiento tenant y orden operativo', async () => {
    queryBuilderMock.getMany.mockResolvedValue([{ id: 'mov-2' }]);

    const result = await service.findAll(user);

    expect(result).toEqual([{ id: 'mov-2' }]);
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'movimiento.empresa_id = :empresaId',
      { empresaId: user.empresaId },
    );
    expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
      'movimiento.ocurrido_en',
      'DESC',
    );
    expect(queryBuilderMock.addOrderBy).toHaveBeenCalledWith(
      'movimiento.created_at',
      'DESC',
    );
  });
});
