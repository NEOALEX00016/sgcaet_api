import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AsignacionesBolsaTelecomService } from './asignaciones-bolsa-telecom.service';
import { AsignacionBolsaTelecom } from './entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';

describe('AsignacionesBolsaTelecomService', () => {
  let service: AsignacionesBolsaTelecomService;
  const asignacionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const bolsasRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const suscripcionesRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const user = {
    userId: '44444444-4444-4444-4444-444444444444',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const queryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionesBolsaTelecomService,
        {
          provide: getRepositoryToken(AsignacionBolsaTelecom),
          useValue: asignacionesRepositoryMock,
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
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
        },
        {
          provide: getRepositoryToken(SuscripcionesLinea),
          useValue: suscripcionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<AsignacionesBolsaTelecomService>(
      AsignacionesBolsaTelecomService,
    );
    jest.clearAllMocks();
    asignacionesRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
    queryBuilderMock.where.mockReturnThis();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.innerJoin.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear asignacion de bolsa y registrar bitacora', async () => {
    const dto = {
      bolsaTelecomId: '22222222-2222-2222-2222-222222222222',
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      cantidad: '10',
      unidad: 'gb',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    bolsasRepositoryMock.findOne.mockResolvedValue({
      id: dto.bolsaTelecomId,
      empresaId: user.empresaId,
      estado: 'activa',
      iniciaEn: new Date(Date.now() - 86400000),
      venceEn: new Date(Date.now() + 86400000),
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue({
      id: 'sus-1',
      empresaId: user.empresaId,
      lineaTelefonicaId: dto.lineaTelefonicaId,
      estado: 'activa',
      iniciaEn: new Date(Date.now() - 86400000),
      venceEn: new Date(Date.now() + 86400000),
    });

    const creada = { id: 'abt-1', ...dto, estado: 'activa' };
    asignacionesRepositoryMock.create.mockReturnValue(creada);
    asignacionesRepositoryMock.save.mockResolvedValue(creada);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'abt-1', estado: 'activa' });
  });

  it('rechaza acceso a una asignacion de otro tenant', async () => {
    asignacionesRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('asig-tenant-b', user)).rejects.toThrow(
      'no encontrada',
    );
  });

  it('rechaza create cuando la linea no tiene suscripcion activa vigente', async () => {
    const dto = {
      bolsaTelecomId: '22222222-2222-2222-2222-222222222222',
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      cantidad: '10',
      unidad: 'gb',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    bolsasRepositoryMock.findOne.mockResolvedValue({
      id: dto.bolsaTelecomId,
      empresaId: user.empresaId,
      estado: 'activa',
      iniciaEn: new Date(Date.now() - 86400000),
      venceEn: new Date(Date.now() + 86400000),
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza create cuando la bolsa no esta vigente', async () => {
    const dto = {
      bolsaTelecomId: '22222222-2222-2222-2222-222222222222',
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      cantidad: '10',
      unidad: 'gb',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    bolsasRepositoryMock.findOne.mockResolvedValue({
      id: dto.bolsaTelecomId,
      empresaId: user.empresaId,
      estado: 'vencida',
      iniciaEn: new Date(Date.now() - 86400000),
      venceEn: new Date(Date.now() - 1000),
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue({
      id: 'sus-1',
      empresaId: user.empresaId,
      lineaTelefonicaId: dto.lineaTelefonicaId,
      estado: 'activa',
      iniciaEn: new Date(Date.now() - 86400000),
      venceEn: new Date(Date.now() + 86400000),
    });

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('findAll aplica filtros de linea/estado/vigencia', async () => {
    queryBuilderMock.getMany.mockResolvedValue([{ id: 'abt-1' }]);

    const result = await service.findAll(user, {
      lineaTelefonicaId: 'linea-1',
      estado: 'activa',
      vigencia: 'vigente',
    });

    expect(result).toEqual([{ id: 'abt-1' }]);
    expect(asignacionesRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('asignacion');
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'asignacion.linea_telefonica_id = :lineaTelefonicaId',
      { lineaTelefonicaId: 'linea-1' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'asignacion.estado = :estado',
      { estado: 'activa' },
    );
  });
});
