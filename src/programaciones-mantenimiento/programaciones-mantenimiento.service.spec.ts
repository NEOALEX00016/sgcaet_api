import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProgramacionesMantenimientoService } from './programaciones-mantenimiento.service';

describe('ProgramacionesMantenimientoService', () => {
  const user = { userId: 'user-1', empresaId: 'empresa-1' } as any;
  let repository: any;
  let dataSource: any;
  let service: ProgramacionesMantenimientoService;

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'schedule-1', ...value })),
      find: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn((target, value) => Object.assign(target, value)),
    };
    dataSource = {
      getRepository: jest.fn(),
      transaction: jest.fn(),
    };
    service = new ProgramacionesMantenimientoService(repository, dataSource);
  });

  it.each([
    ['2026-09-21', 15, 'vencida'],
    ['2026-09-22', 0, 'proxima'],
    ['2026-10-01', 15, 'proxima'],
    ['2026-10-08', 15, 'vigente'],
  ])(
    'deriva %s con anticipacion %s como %s',
    (proximaFecha, anticipacionDias, expected) => {
      expect(
        service.deriveEstado(
          { proximaFecha, anticipacionDias },
          new Date('2026-09-22T18:00:00.000Z'),
        ),
      ).toBe(expected);
    },
  );

  it('rechaza activo de otro tenant al crear', async () => {
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.create(
        {
          activoId: '11111111-1111-4111-8111-111111111111',
          nombre: 'Revision anual',
          frecuenciaDias: 365,
          proximaFecha: '2026-09-22',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('bloquea nombre activo duplicado para el mismo activo y tenant', async () => {
    dataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ id: 'asset-1' }),
    });
    repository.findOne.mockResolvedValue({ id: 'existing' });

    await expect(
      service.create(
        {
          activoId: '11111111-1111-4111-8111-111111111111',
          nombre: 'Revision anual',
          frecuenciaDias: 365,
          proximaFecha: '2026-09-22',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('bloquea generar una segunda orden activa para el activo', async () => {
    const schedule = {
      id: 'schedule-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      nombre: 'Revision',
      frecuenciaDias: 30,
      proximaFecha: '2026-09-22',
      anticipacionDias: 15,
      estaActiva: true,
    };
    const repositories = new Map<any, any>();
    repositories.set(
      require('./entities/programaciones-mantenimiento.entity')
        .ProgramacionMantenimiento,
      {
        findOne: jest.fn().mockResolvedValue(schedule),
      },
    );
    repositories.set(require('../activos/entities/activo.entity').Activo, {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'asset-1', estado: 'registrado' }),
    });
    repositories.set(
      require('../reparaciones-activo/entities/reparaciones-activo.entity')
        .ReparacionActivo,
      {
        findOne: jest.fn().mockResolvedValue({ id: 'active-order' }),
      },
    );
    dataSource.transaction.mockImplementation((work) =>
      work({ getRepository: (entity: any) => repositories.get(entity) }),
    );

    await expect(
      service.generarOrden('schedule-1', user),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('no avanza la programacion cuando falla la escritura de outbox', async () => {
    const schedule = {
      id: 'schedule-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      nombre: 'Revision',
      frecuenciaDias: 30,
      proximaFecha: '2026-09-22',
      anticipacionDias: 15,
      estaActiva: true,
    };
    const scheduleSave = jest.fn();
    const assetSave = jest.fn();
    const repairSave = jest.fn().mockResolvedValue({
      id: 'order-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'abierta',
    });
    const repositories = new Map<any, any>();
    const entities = {
      schedule: require('./entities/programaciones-mantenimiento.entity')
        .ProgramacionMantenimiento,
      asset: require('../activos/entities/activo.entity').Activo,
      repair:
        require('../reparaciones-activo/entities/reparaciones-activo.entity')
          .ReparacionActivo,
      resource:
        require('../asignacion-recursos/entities/asignacion-recurso.entity')
          .AsignacionRecurso,
      audit:
        require('../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity')
          .BitacoraAuditoriaSistema,
      outbox:
        require('../outbox-eventos-integracion/entities/outbox-evento-integracion.entity')
          .OutboxEventoIntegracion,
    };
    repositories.set(entities.schedule, {
      findOne: jest.fn().mockResolvedValue(schedule),
      save: scheduleSave,
    });
    repositories.set(entities.asset, {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'asset-1', estado: 'registrado' }),
      save: assetSave,
    });
    repositories.set(entities.repair, {
      findOne: jest.fn().mockResolvedValue(null),
      create: (value: any) => value,
      save: repairSave,
    });
    repositories.set(entities.resource, {
      findOne: jest.fn().mockResolvedValue(null),
    });
    repositories.set(entities.audit, {
      save: jest.fn().mockResolvedValue(undefined),
    });
    repositories.set(entities.outbox, {
      save: jest.fn().mockRejectedValue(new Error('outbox unavailable')),
    });
    dataSource.transaction.mockImplementation((work) =>
      work({ getRepository: (entity: any) => repositories.get(entity) }),
    );

    await expect(service.generarOrden('schedule-1', user)).rejects.toThrow(
      'outbox unavailable',
    );
    expect(scheduleSave).not.toHaveBeenCalled();
  });

  it('crea orden, auditoria y outbox antes de avanzar la fecha', async () => {
    const schedule = {
      id: 'schedule-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      nombre: 'Revision trimestral',
      descripcion: 'Limpieza y diagnostico',
      frecuenciaDias: 30,
      proximaFecha: '2026-09-22',
      anticipacionDias: 15,
      estaActiva: true,
    };
    const asset = { id: 'asset-1', estado: 'asignado' };
    const scheduleSave = jest.fn(async (value) => value);
    const repairSave = jest.fn(async (value) => ({ id: 'order-1', ...value }));
    const auditSave = jest.fn();
    const outboxSave = jest.fn();
    const entities = {
      schedule: require('./entities/programaciones-mantenimiento.entity')
        .ProgramacionMantenimiento,
      asset: require('../activos/entities/activo.entity').Activo,
      repair:
        require('../reparaciones-activo/entities/reparaciones-activo.entity')
          .ReparacionActivo,
      resource:
        require('../asignacion-recursos/entities/asignacion-recurso.entity')
          .AsignacionRecurso,
      assignment: require('../asignaciones/entities/asignacione.entity')
        .Asignacion,
      audit:
        require('../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity')
          .BitacoraAuditoriaSistema,
      outbox:
        require('../outbox-eventos-integracion/entities/outbox-evento-integracion.entity')
          .OutboxEventoIntegracion,
    };
    const repositories = new Map<any, any>([
      [
        entities.schedule,
        { findOne: jest.fn().mockResolvedValue(schedule), save: scheduleSave },
      ],
      [
        entities.asset,
        { findOne: jest.fn().mockResolvedValue(asset), save: jest.fn() },
      ],
      [
        entities.repair,
        {
          findOne: jest.fn().mockResolvedValue(null),
          create: (value: any) => value,
          save: repairSave,
        },
      ],
      [
        entities.resource,
        {
          findOne: jest
            .fn()
            .mockResolvedValue({ asignacionId: 'assignment-1' }),
        },
      ],
      [
        entities.assignment,
        {
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'assignment-1', estado: 'entregada' }),
        },
      ],
      [entities.audit, { save: auditSave }],
      [entities.outbox, { save: outboxSave }],
    ]);
    dataSource.transaction.mockImplementation((work) =>
      work({ getRepository: (entity: any) => repositories.get(entity) }),
    );

    const result = await service.generarOrden('schedule-1', user);

    expect(result).toEqual(expect.objectContaining({ id: 'order-1' }));
    expect(repairSave).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoServicio: 'mantenimiento',
        programacionMantenimientoId: 'schedule-1',
        asignacionId: 'assignment-1',
      }),
    );
    expect(asset.estado).toBe('en_reparacion');
    expect(auditSave).toHaveBeenCalled();
    expect(outboxSave).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'orden_recibida',
        aggregateId: 'order-1',
      }),
    );
    expect(scheduleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        ultimaReparacionId: 'order-1',
        proximaFecha: '2026-10-22',
      }),
    );
    expect(outboxSave.mock.invocationCallOrder[0]).toBeLessThan(
      scheduleSave.mock.invocationCallOrder[0],
    );
  });

  it('rechaza generar orden para una programacion cross-tenant', async () => {
    dataSource.transaction.mockImplementation((work) =>
      work({
        getRepository: () => ({ findOne: jest.fn().mockResolvedValue(null) }),
      }),
    );

    await expect(service.generarOrden('foreign', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rechaza generar antes de la ventana de anticipacion', async () => {
    dataSource.transaction.mockImplementation((work) =>
      work({
        getRepository: () => ({
          findOne: jest.fn().mockResolvedValue({
            id: 'schedule-1',
            empresaId: user.empresaId,
            activoId: 'asset-1',
            proximaFecha: '2999-01-01',
            anticipacionDias: 15,
            estaActiva: true,
          }),
        }),
      }),
    );

    await expect(
      service.generarOrden('schedule-1', user),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
