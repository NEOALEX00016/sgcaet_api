import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { LineasTelefonicasService } from './lineas-telefonicas.service';
import { LineaTelefonica } from './entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

describe('LineasTelefonicasService', () => {
  let service: LineasTelefonicasService;
  const lineasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const asignacionesRepositoryMock = { findOne: jest.fn() };
  const asignacionRecursosRepositoryMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
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
  const traceQueryBuilderMock = {
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LineasTelefonicasService,
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
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
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: asignacionRecursosRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<LineasTelefonicasService>(LineasTelefonicasService);
    jest.clearAllMocks();
    lineasRepositoryMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
    asignacionRecursosRepositoryMock.createQueryBuilder.mockReturnValue(
      traceQueryBuilderMock,
    );
    queryBuilderMock.where.mockReturnThis();
    queryBuilderMock.andWhere.mockReturnThis();
    queryBuilderMock.orderBy.mockReturnThis();
    traceQueryBuilderMock.innerJoin.mockReturnThis();
    traceQueryBuilderMock.leftJoin.mockReturnThis();
    traceQueryBuilderMock.where.mockReturnThis();
    traceQueryBuilderMock.andWhere.mockReturnThis();
    traceQueryBuilderMock.select.mockReturnThis();
    traceQueryBuilderMock.orderBy.mockReturnThis();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear linea y registrar bitacora', async () => {
    const dto = {
      numero: '8090001111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    const creada = {
      id: 'lin-1',
      ...dto,
      tipoLinea: 'voz_datos',
      estado: 'registrada',
      estaActiva: true,
    };
    lineasRepositoryMock.create.mockReturnValue(creada);
    lineasRepositoryMock.save.mockResolvedValue(creada);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(result).toMatchObject({ id: 'lin-1', numero: '8090001111' });
    expect(lineasRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId, numero: '8090001111' },
    });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza create cuando el numero ya existe en el tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: 'lin-existente',
      empresaId: user.empresaId,
      numero: '8090001111',
    });

    await expect(
      service.create(
        {
          numero: '8090001111',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe cambiar linea asignada en asignacion', async () => {
    const empresaId = user.empresaId;
    const asignacionId = '33333333-3333-3333-3333-333333333333';
    const lineaAnteriorId = '44444444-4444-4444-4444-444444444444';
    const lineaNuevaId = '55555555-5555-5555-5555-555555555555';

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: asignacionId,
      empresaId,
    });
    lineasRepositoryMock.findOne
      .mockResolvedValueOnce({ id: lineaAnteriorId, empresaId })
      .mockResolvedValueOnce({ id: lineaNuevaId, empresaId });
    asignacionRecursosRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'res-old',
        estaActivo: true,
        lineaTelefonicaId: lineaAnteriorId,
      })
      .mockResolvedValueOnce(null);
    asignacionRecursosRepositoryMock.create.mockReturnValue({
      id: 'res-new',
      estaActivo: true,
      lineaTelefonicaId: lineaNuevaId,
    });
    asignacionRecursosRepositoryMock.save.mockResolvedValue({});
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-2' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.cambiarLineaAsignada(
      user,
      asignacionId,
      lineaAnteriorId,
      lineaNuevaId,
    );

    expect(result).toEqual({ ok: true });
    expect(asignacionRecursosRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza reemplazo si linea nueva ya esta asignada', async () => {
    const empresaId = '11111111-1111-1111-1111-111111111111';
    const asignacionId = '33333333-3333-3333-3333-333333333333';
    const lineaAnteriorId = '44444444-4444-4444-4444-444444444444';
    const lineaNuevaId = '55555555-5555-5555-5555-555555555555';

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: asignacionId,
      empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: lineaAnteriorId,
      empresaId,
    });
    asignacionRecursosRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'res-old',
        estaActivo: true,
        lineaTelefonicaId: lineaAnteriorId,
      })
      .mockResolvedValueOnce({
        id: 'res-busy',
        estaActivo: true,
        lineaTelefonicaId: lineaNuevaId,
      });

    await expect(
      service.cambiarLineaAsignada(
        user,
        asignacionId,
        lineaAnteriorId,
        lineaNuevaId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza acceso a una linea de otro tenant', async () => {
    lineasRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('linea-tenant-b', user)).rejects.toThrow(
      'no encontrada',
    );
  });

  it('lista lineas solo del tenant autenticado', async () => {
    lineasRepositoryMock.find.mockResolvedValue([{ id: 'lin-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(lineasRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('aplica filtros de estado/activo/search usando query builder', async () => {
    const expected = [{ id: 'lin-2' }];
    queryBuilderMock.getMany.mockResolvedValue(expected);

    const result = await service.findAll(user, {
      estado: 'activa',
      estaActiva: true,
      search: '809',
    });

    expect(result).toEqual(expected);
    expect(lineasRepositoryMock.find).not.toHaveBeenCalled();
    expect(lineasRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('linea');
    expect(queryBuilderMock.where).toHaveBeenCalledWith(
      'linea.empresa_id = :empresaId',
      { empresaId: user.empresaId },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'linea.estado = :estado',
      { estado: 'activa' },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'linea.esta_activa = :estaActiva',
      { estaActiva: true },
    );
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      '(linea.numero ILIKE :search OR linea.iccid ILIKE :search)',
      { search: '%809%' },
    );
    expect(queryBuilderMock.orderBy).toHaveBeenCalledWith(
      'linea.created_at',
      'DESC',
    );
  });

  it('desactiva linea en remove cambiando estado a cancelada', async () => {
    const linea = {
      id: 'lin-1',
      empresaId: user.empresaId,
      numero: '8090001111',
      estado: 'activa',
      estaActiva: true,
    };

    lineasRepositoryMock.findOne.mockResolvedValue(linea);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.save.mockResolvedValue({
      ...linea,
      estado: 'cancelada',
      estaActiva: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('lin-1', user);

    expect(lineasRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'lin-1',
        estado: 'cancelada',
        estaActiva: false,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('retorna trazabilidad persona-linea tenant-scoped', async () => {
    traceQueryBuilderMock.getRawMany.mockResolvedValue([
      {
        recurso_id: 'res-1',
        asignacion_id: 'asg-1',
        linea_telefonica_id: 'linea-1',
        recurso_activo: true,
        recurso_created_at: '2026-09-18T00:00:00.000Z',
        linea_numero: '8090001111',
        persona_id: 'per-1',
        persona_nombre: 'Ana Perez',
        asignacion_estado: 'entregada',
      },
    ]);

    const result = await service.getPersonaLineaTrace(user, {
      personaId: 'per-1',
      soloActivas: true,
    });

    expect(asignacionRecursosRepositoryMock.createQueryBuilder).toHaveBeenCalledWith('recurso');
    expect(traceQueryBuilderMock.andWhere).toHaveBeenCalledWith(
      'asignacion.persona_id = :personaId',
      { personaId: 'per-1' },
    );
    expect(result).toEqual([
      expect.objectContaining({
        asignacionRecursoId: 'res-1',
        asignacionId: 'asg-1',
        lineaTelefonicaId: 'linea-1',
        numeroLinea: '8090001111',
        personaId: 'per-1',
        personaNombre: 'Ana Perez',
        estadoAsignacion: 'entregada',
        recursoActivo: true,
      }),
    ]);
  });
});
