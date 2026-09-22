import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SuscripcionesLineaService } from './suscripciones-linea.service';
import { SuscripcionesLinea } from './entities/suscripciones-linea.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { PlanComercialTelecom } from '../planes-comerciales-telecom/entities/planes-comerciales-telecom.entity';

describe('SuscripcionesLineaService', () => {
  let service: SuscripcionesLineaService;
  const suscripcionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const planesRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const planesComercialesRepositoryMock = { findOne: jest.fn() };
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const queryBuilderMock = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuscripcionesLineaService,
        {
          provide: getRepositoryToken(SuscripcionesLinea),
          useValue: suscripcionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
        },
        {
          provide: getRepositoryToken(PlanesTelefonico),
          useValue: planesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: getRepositoryToken(PlanComercialTelecom), useValue: planesComercialesRepositoryMock },
      ],
    }).compile();

    service = module.get<SuscripcionesLineaService>(SuscripcionesLineaService);
    jest.clearAllMocks();
    suscripcionesRepositoryMock.createQueryBuilder.mockReturnValue(
      queryBuilderMock,
    );
    queryBuilderMock.where.mockReturnThis();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
  });

  it('debe rechazar fecha de vencimiento invalida', async () => {
    const dto = {
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      planTelefonicoId: '44444444-4444-4444-4444-444444444444',
      iniciaEn: '2026-09-08T00:00:00.000Z',
      venceEn: '2026-09-07T00:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue({
      id: dto.planTelefonicoId,
      empresaId: user.empresaId,
      estaActivo: true,
    });

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza acceso a una suscripcion de otro tenant', async () => {
    suscripcionesRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('sus-tenant-b', user)).rejects.toThrow(
      'no encontrada',
    );
  });

  it('lista suscripciones solo del tenant autenticado', async () => {
    suscripcionesRepositoryMock.find.mockResolvedValue([{ id: 'sus-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(suscripcionesRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('aplica filtros de estado y vigencia en findAll', async () => {
    queryBuilderMock.getMany.mockResolvedValue([{ id: 'sus-2' }]);

    const result = await service.findAll(user, {
      estado: 'activa',
      vigencia: 'vigente',
      lineaTelefonicaId: 'linea-a',
    });

    expect(result).toEqual([{ id: 'sus-2' }]);
    expect(suscripcionesRepositoryMock.find).not.toHaveBeenCalled();
    expect(suscripcionesRepositoryMock.createQueryBuilder).toHaveBeenCalledWith(
      'suscripcion',
    );
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'suscripcion.empresa_id = :empresaId',
      { empresaId: user.empresaId },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'suscripcion.linea_telefonica_id = :lineaTelefonicaId',
      { lineaTelefonicaId: 'linea-a' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'suscripcion.estado = :estado',
      { estado: 'activa' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      "suscripcion.estado = 'activa' AND suscripcion.inicia_en <= NOW() AND (suscripcion.vence_en IS NULL OR suscripcion.vence_en > NOW())",
    );
  });

  it('rechaza create cuando ya existe suscripcion activa para la linea', async () => {
    const dto = {
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      planTelefonicoId: '44444444-4444-4444-4444-444444444444',
      iniciaEn: '2026-09-08T00:00:00.000Z',
      estado: 'activa',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue({
      id: dto.planTelefonicoId,
      empresaId: user.empresaId,
      estaActivo: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue({
      id: 'sus-activa-existente',
      empresaId: user.empresaId,
      lineaTelefonicaId: dto.lineaTelefonicaId,
      estado: 'activa',
    });

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza create activa cuando su vigencia no es coherente (vence en pasado)', async () => {
    const dto = {
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      planTelefonicoId: '44444444-4444-4444-4444-444444444444',
      iniciaEn: new Date(Date.now() - 86400000).toISOString(),
      venceEn: new Date(Date.now() - 3600000).toISOString(),
      estado: 'activa',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue({
      id: dto.planTelefonicoId,
      empresaId: user.empresaId,
      estaActivo: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza create vencida cuando no tiene fecha de vencimiento pasada', async () => {
    const dto = {
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      planTelefonicoId: '44444444-4444-4444-4444-444444444444',
      iniciaEn: new Date(Date.now() - 86400000).toISOString(),
      venceEn: new Date(Date.now() + 86400000).toISOString(),
      estado: 'vencida',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue({
      id: dto.planTelefonicoId,
      empresaId: user.empresaId,
      estaActivo: true,
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza update cuando intenta dejar activa una segunda suscripcion de la misma linea', async () => {
    const actual = {
      id: 'sus-2',
      empresaId: user.empresaId,
      lineaTelefonicaId: 'linea-a',
      planTelefonicoId: 'plan-a',
      iniciaEn: new Date('2026-09-01T00:00:00.000Z'),
      estado: 'suspendida',
    };

    suscripcionesRepositoryMock.findOne
      .mockResolvedValueOnce(actual)
      .mockResolvedValueOnce({
        id: 'sus-1',
        empresaId: user.empresaId,
        lineaTelefonicaId: 'linea-a',
        estado: 'activa',
      });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: 'linea-a',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue({
      id: 'plan-a',
      empresaId: user.empresaId,
      estaActivo: true,
    });

    await expect(
      service.update(
        'sus-2',
        {
          estado: 'activa',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('cancela suscripcion en remove (baja logica)', async () => {
    const actual = {
      id: 'sus-1',
      empresaId: user.empresaId,
      lineaTelefonicaId: 'linea-a',
      planTelefonicoId: 'plan-a',
      iniciaEn: new Date('2026-09-01T00:00:00.000Z'),
      estado: 'activa',
    };

    suscripcionesRepositoryMock.findOne.mockResolvedValue(actual);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    suscripcionesRepositoryMock.save.mockResolvedValue({
      ...actual,
      estado: 'cancelada',
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('sus-1', user);

    expect(suscripcionesRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'sus-1',
        estado: 'cancelada',
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza FK cross-tenant cuando la linea no pertenece al tenant', async () => {
    const dto = {
      lineaTelefonicaId: 'linea-tenant-b',
      planTelefonicoId: '44444444-4444-4444-4444-444444444444',
      iniciaEn: '2026-09-08T00:00:00.000Z',
      estado: 'activa',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(lineasRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'linea-tenant-b',
        empresaId: user.empresaId,
      },
    });
  });

  it('rechaza FK cross-tenant cuando el plan no pertenece al tenant', async () => {
    const dto = {
      lineaTelefonicaId: '33333333-3333-3333-3333-333333333333',
      planTelefonicoId: 'plan-tenant-b',
      iniciaEn: '2026-09-08T00:00:00.000Z',
      estado: 'activa',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
    });
    planesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as never, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(planesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'plan-tenant-b',
        empresaId: user.empresaId,
      },
    });
  });
});
