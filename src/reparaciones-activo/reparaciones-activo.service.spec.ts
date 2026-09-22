import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { DataSource } from 'typeorm';
import { ReparacionesActivoService } from './reparaciones-activo.service';
import { ReparacionActivo } from './entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { HistorialComponentesActivo } from '../historial-componentes-activo/entities/historial-componentes-activo.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { UpdateReparacionActivoDto } from './dto/update-reparacion-activo.dto';
import { FormulariosReparacionService } from '../formularios-reparacion/formularios-reparacion.service';
import { OutboxEventoIntegracion } from '../outbox-eventos-integracion/entities/outbox-evento-integracion.entity';

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
  const activosRepositoryMock = { findOne: jest.fn(), save: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const outboxRepositoryMock = {
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
  };
  const asignacionesRepositoryMock = { findOne: jest.fn(), find: jest.fn() };
  const recursosRepositoryMock = { findOne: jest.fn(), find: jest.fn() };
  const dataSourceMock = { transaction: jest.fn(), getRepository: jest.fn() };
  const formulariosReparacionServiceMock = {
    assertRequiredComplete: jest.fn(),
    prepare: jest.fn(),
    findByRepair: jest.fn(),
    complete: jest.fn(),
  };

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
        {
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: recursosRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        {
          provide: FormulariosReparacionService,
          useValue: formulariosReparacionServiceMock,
        },
      ],
    }).compile();

    service = module.get<ReparacionesActivoService>(ReparacionesActivoService);
    jest.clearAllMocks();
    recursosRepositoryMock.findOne.mockResolvedValue(null);
    recursosRepositoryMock.find.mockResolvedValue([]);
    asignacionesRepositoryMock.findOne.mockResolvedValue(null);
    asignacionesRepositoryMock.find.mockResolvedValue([]);
    dataSourceMock.transaction.mockImplementation(async (callback) =>
      callback({
        getRepository: (entity) =>
          entity === ReparacionActivo
            ? reparacionesRepositoryMock
            : entity === Activo
              ? activosRepositoryMock
              : entity === Asignacion
                ? asignacionesRepositoryMock
                : entity === AsignacionRecurso
                  ? recursosRepositoryMock
                  : entity === OutboxEventoIntegracion
                    ? outboxRepositoryMock
                    : bitacoraRepositoryMock,
      }),
    );
    dataSourceMock.getRepository.mockReturnValue(repository());
    formulariosReparacionServiceMock.assertRequiredComplete.mockResolvedValue(
      undefined,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('proyecta reportes sin actores, diagnostico ni observaciones', async () => {
    reparacionesRepositoryMock.find.mockResolvedValue([
      {
        id: 'repair-report',
        empresaId: user.empresaId,
        activoId: 'asset-1',
        tipoServicio: 'reparacion',
        estado: 'cerrada',
        fechaIngreso: new Date('2026-09-20T10:00:00Z'),
        fechaSalida: new Date('2026-09-21T10:00:00Z'),
        resultado: 'resuelto',
        costo: '20.00',
        moneda: 'USD',
        diagnostico: 'dato sensible',
        observaciones: 'dato sensible',
        creadoPor: 'actor-1',
        diagnosticoComunicadoPor: 'actor-2',
        createdAt: new Date('2026-09-20T10:00:00Z'),
        updatedAt: new Date('2026-09-21T10:00:00Z'),
      },
    ]);

    const [row] = await service.findOrdersReport(user);

    expect(row).toMatchObject({ id: 'repair-report', costo: '20.00' });
    expect(row).not.toHaveProperty('empresaId');
    expect(row).not.toHaveProperty('diagnostico');
    expect(row).not.toHaveProperty('observaciones');
    expect(row).not.toHaveProperty('creadoPor');
    expect(row).not.toHaveProperty('diagnosticoComunicadoPor');
  });

  it('compone la linea de tiempo tenant-scoped y la ordena descendente', async () => {
    const assetId = '22222222-2222-4222-8222-222222222222';
    activosRepositoryMock.findOne.mockResolvedValue({ id: assetId });
    reparacionesRepositoryMock.find.mockResolvedValue([
      {
        id: 'repair-1',
        activoId: assetId,
        tipoServicio: 'reparacion',
        diagnostico: 'Falla de disco',
        estado: 'cerrada',
        fechaIngreso: new Date('2026-09-20T10:00:00Z'),
        fechaSalida: new Date('2026-09-21T10:00:00Z'),
        resolucion: 'Disco sustituido',
        creadoPor: user.userId,
      },
    ]);
    recursosRepositoryMock.find.mockResolvedValue([
      {
        id: 'resource-1',
        asignacionId: 'assignment-1',
        createdAt: new Date('2026-09-19T10:00:00Z'),
        estaActivo: true,
      },
    ]);
    asignacionesRepositoryMock.find.mockResolvedValue([
      {
        id: 'assignment-1',
        fechaAsignacion: new Date('2026-09-19T10:00:00Z'),
        estado: 'entregada',
        personaId: 'person-1',
      },
    ]);
    dataSourceMock.getRepository.mockImplementation((entity) =>
      entity === HistorialComponentesActivo
        ? repository({
            find: jest.fn().mockResolvedValue([
              {
                id: 'change-1',
                componenteClave: 'disco',
                valorAnterior: 'HDD',
                valorNuevo: 'SSD',
                cambiadoEn: new Date('2026-09-21T09:00:00Z'),
                cambiadoPor: user.userId,
                reparacionActivoId: 'repair-1',
              },
            ]),
          })
        : repository(),
    );

    const result = await service.findAssetTimeline(assetId, user);

    expect(activosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: expect.objectContaining({ id: assetId, empresaId: user.empresaId }),
    });
    expect(result.map((event) => event.type)).toEqual([
      'repair_result',
      'component_change',
      'repair',
      'assignment',
    ]);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'repair-result:repair-1',
        orderId: 'repair-1',
        date: '2026-09-21T10:00:00.000Z',
      }),
    );
  });

  it('rechaza la linea de tiempo de un activo de otro tenant', async () => {
    activosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.findAssetTimeline('foreign-asset', user)).rejects.toThrow(
      'Activo no encontrado',
    );
    expect(reparacionesRepositoryMock.find).not.toHaveBeenCalled();
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
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoId,
      estado: 'asignado',
    });
    activosRepositoryMock.save.mockImplementation(async (value) => value);
    reparacionesRepositoryMock.findOne.mockResolvedValue(null);
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
    expect(reparacionesRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ estadoActivoAnterior: 'asignado' }),
    );
    expect(activosRepositoryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
    expect(activosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'en_reparacion' }),
    );
    expect(outboxRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'reparacion_activo',
        eventType: 'orden_recibida',
        idempotencyKey: 'orden_recibida:rep-1',
      }),
    );
  });

  it('propaga fallo de outbox para rollback atomico de la creacion', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: 'asset-atomic',
      estado: 'asignado',
    });
    reparacionesRepositoryMock.findOne.mockResolvedValue(null);
    reparacionesRepositoryMock.create.mockReturnValue({
      id: 'rep-atomic',
      empresaId: user.empresaId,
      activoId: 'asset-atomic',
      estado: 'abierta',
    });
    reparacionesRepositoryMock.save.mockImplementation(async (value) => value);
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    outboxRepositoryMock.save.mockRejectedValueOnce(new Error('outbox unavailable'));

    await expect(
      service.create(
        {
          activoId: 'asset-atomic',
          tipoServicio: 'reparacion',
          diagnostico: 'Prueba atomica',
          fechaIngreso: '2026-09-22T10:00:00Z',
        },
        user,
      ),
    ).rejects.toThrow('outbox unavailable');
    expect(dataSourceMock.transaction).toHaveBeenCalled();
  });

  it.each(['dado_de_baja', 'desechado', 'perdido', 'robado'])(
    'rechaza crear una orden para activo %s',
    async (estado) => {
      usuariosRepositoryMock.findOne.mockResolvedValue({
        id: user.userId,
        empresaId: user.empresaId,
      });
      activosRepositoryMock.findOne.mockResolvedValue({
        id: 'asset-invalid',
        estado,
      });
      await expect(
        service.create(
          {
            activoId: 'asset-invalid',
            tipoServicio: 'reparacion',
            diagnostico: 'Diagnóstico válido',
            fechaIngreso: '2026-09-08T10:00:00Z',
          },
          user,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rechaza cancelada en el DTO de PATCH', async () => {
    const dto = Object.assign(new UpdateReparacionActivoDto(), {
      estado: 'cancelada',
    });
    expect(await validate(dto)).toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'estado' })]),
    );
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
      estado: 'abierta',
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
    reparacionesRepositoryMock.merge.mockImplementation((entity, patch) =>
      Object.assign(entity, patch),
    );
    reparacionesRepositoryMock.save.mockImplementation(async (value) => value);
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.update(
      'rep-2',
      {
        estado: 'en_proceso',
      },
      user,
    );

    expect(result.estado).toBe('en_proceso');
    expect(
      formulariosReparacionServiceMock.assertRequiredComplete,
    ).toHaveBeenCalledWith(actual, 'entrada', user.empresaId);
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        valoresAnteriores: { estado: 'abierta', resultado: null },
        valoresNuevos: { estado: 'en_proceso', resultado: null },
      }),
    );
  });

  it('publica esperando_repuestos solo al entrar en ese estado', async () => {
    const actual = {
      id: 'rep-waiting',
      empresaId: user.empresaId,
      activoId: 'asset-waiting',
      asignacionId: 'assignment-waiting',
      estado: 'en_proceso',
      diagnostico: 'Requiere pieza',
      fechaIngreso: new Date('2026-09-08T10:00:00Z'),
      updatedAt: new Date('2026-09-22T10:00:00Z'),
    };
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    reparacionesRepositoryMock.findOne.mockResolvedValue(actual);
    reparacionesRepositoryMock.merge.mockImplementation((entity, patch) =>
      Object.assign(entity, patch),
    );
    reparacionesRepositoryMock.save.mockImplementation(async (value) => value);
    bitacoraRepositoryMock.create.mockImplementation((value) => value);

    await service.update(
      actual.id,
      { estado: 'esperando_repuestos' },
      user,
    );

    expect(outboxRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'reparacion_activo',
        eventType: 'esperando_repuestos',
        idempotencyKey: expect.stringContaining(
          'esperando_repuestos:rep-waiting:',
        ),
      }),
    );
  });

  it('debe comunicar el diagnostico y registrar el actor', async () => {
    const actual = {
      id: 'rep-3',
      empresaId: user.empresaId,
      activoId: 'activo-3',
      estado: 'en_proceso',
      diagnostico: 'Falla de almacenamiento',
      estadoComunicacionDiagnostico: 'pendiente',
      diagnosticoComunicadoEn: undefined,
    };
    reparacionesRepositoryMock.findOne.mockResolvedValue(actual);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    reparacionesRepositoryMock.save.mockImplementation(async (value) => value);
    const result = await service.comunicarDiagnostico('rep-3', user);
    expect(result.estadoComunicacionDiagnostico).toBe('comunicado');
    expect(result.diagnosticoComunicadoPor).toBe(user.userId);
    await service.comunicarDiagnostico('rep-3', user);
    expect(outboxRepositoryMock.save).toHaveBeenCalledTimes(1);
    expect(outboxRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'reparacion_activo',
        eventType: 'diagnostico_comunicado',
        idempotencyKey: expect.stringContaining(
          'diagnostico_comunicado:rep-3:',
        ),
      }),
    );
  });

  it('debe resolver en transaccion y guardar cambios de componentes', async () => {
    const actual = {
      id: 'rep-4',
      empresaId: user.empresaId,
      activoId: 'activo-1',
      estado: 'esperando_repuestos',
      fechaIngreso: new Date('2026-09-08T10:00:00.000Z'),
      observaciones: undefined,
    };
    const atributosRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ clave: 'ram', valorTexto: '16', unidad: 'GB' }),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const historialRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const reparacionesTransactionRepository = {
      findOne: jest.fn().mockResolvedValue(actual),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const bitacoraTransactionRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(),
    };
    const activosTransactionRepository = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: actual.activoId, estado: 'en_reparacion' }),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const recursosTransactionRepository = {
      findOne: jest.fn().mockResolvedValue(null),
    };
    const unidadesTransactionRepository = repository();
    const movimientosTransactionRepository = repository();
    dataSourceMock.transaction.mockImplementation(async (callback) =>
      callback({
        getRepository: (entity) =>
          entity === ReparacionActivo
            ? reparacionesTransactionRepository
            : entity === AtributosDinamicosActivo
              ? atributosRepository
              : entity === HistorialComponentesActivo
                ? historialRepository
                : entity === Activo
                  ? activosTransactionRepository
                  : entity === AsignacionRecurso
                    ? recursosTransactionRepository
                    : entity === UnidadRepuesto
                      ? unidadesTransactionRepository
                      : entity === MovimientoRepuesto
                         ? movimientosTransactionRepository
                         : entity === OutboxEventoIntegracion
                           ? outboxRepositoryMock
                           : bitacoraTransactionRepository,
      }),
    );
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    const result = await service.resolver(
      'rep-4',
      {
        resultado: 'resuelto',
        resolucion: 'RAM sustituida y equipo probado',
        fechaSalida: '2026-09-09T10:00:00.000Z',
        cambiosComponentes: [
          {
            clave: 'ram',
            nombre: 'RAM',
            valorNuevo: '32',
            unidad: 'GB',
            motivo: 'Ampliacion',
          },
        ],
      },
      user,
    );

    expect(result.estado).toBe('cerrada');
    expect(
      formulariosReparacionServiceMock.assertRequiredComplete,
    ).toHaveBeenCalledWith(actual, 'salida', user.empresaId, expect.anything());
    expect(historialRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ valorAnterior: '16', valorNuevo: '32' }),
    );
    expect(activosTransactionRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'registrado' }),
    );
    expect(outboxRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        aggregateType: 'reparacion_activo',
        eventType: 'orden_resuelta',
        idempotencyKey: 'orden_resuelta:rep-4',
      }),
    );
  });

  it('debe rechazar la cancelacion de una orden cerrada', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    reparacionesRepositoryMock.findOne.mockResolvedValue({
      id: 'rep-5',
      empresaId: user.empresaId,
      estado: 'cerrada',
    });
    await expect(service.remove('rep-5', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  const repository = (overrides: Record<string, jest.Mock> = {}) => ({
    findOne: jest.fn(),
    find: jest.fn().mockResolvedValue([]),
    create: jest.fn((value) => value),
    save: jest.fn((value) => Promise.resolve(value)),
    ...overrides,
  });

  const workshopManager = (repos: Map<unknown, any>) => ({
    getRepository: (entity) => repos.get(entity) ?? repository(),
  });

  it('debe rechazar reserva no serializada insuficiente sin crear movimiento', async () => {
    const order = {
      id: 'rep-stock',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'abierta',
    };
    const part = {
      id: 'part-1',
      empresaId: user.empresaId,
      especificacionTipoActivoId: 'spec-1',
      esSerializado: false,
      estaActiva: true,
    };
    const movements = repository();
    const stock = repository({
      findOne: jest.fn().mockResolvedValue({
        cantidadDisponible: '1.0000',
        cantidadReservada: '0.0000',
      }),
    });
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [
        PiezaRepuesto,
        repository({ findOne: jest.fn().mockResolvedValue(part) }),
      ],
      [
        Activo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'asset-1', tipoActivoId: 'type-1' }),
        }),
      ],
      [
        TiposActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'type-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [
        EspecificacionTipoActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'spec-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [ExistenciaRepuesto, stock],
      [MovimientoRepuesto, movements],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );

    await expect(
      service.reservarRepuesto(
        'rep-stock',
        { piezaRepuestoId: 'part-1', cantidad: '2' },
        user,
      ),
    ).rejects.toThrow('STOCK_INSUFICIENTE');
    expect(stock.save).not.toHaveBeenCalled();
    expect(movements.save).not.toHaveBeenCalled();
  });

  it('debe liberar reserva no serializada y devolverla a disponible', async () => {
    const order = {
      id: 'rep-release',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'esperando_repuestos',
    };
    const part = {
      id: 'part-1',
      empresaId: user.empresaId,
      especificacionTipoActivoId: 'spec-1',
      esSerializado: false,
      estaActiva: false,
    };
    const balance = {
      cantidadDisponible: '2.0000',
      cantidadReservada: '3.0000',
    };
    const stock = repository({ findOne: jest.fn().mockResolvedValue(balance) });
    const movements = repository({
      find: jest
        .fn()
        .mockResolvedValue([{ tipoMovimiento: 'reserva', cantidad: '3.0000' }]),
    });
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [
        PiezaRepuesto,
        repository({ findOne: jest.fn().mockResolvedValue(part) }),
      ],
      [
        Activo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'asset-1', tipoActivoId: 'type-1' }),
        }),
      ],
      [
        TiposActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'type-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [
        EspecificacionTipoActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'spec-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [ExistenciaRepuesto, stock],
      [MovimientoRepuesto, movements],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );

    await service.liberarRepuesto(
      'rep-release',
      { piezaRepuestoId: 'part-1', cantidad: '2' },
      user,
    );
    expect(repos.get(PiezaRepuesto).findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ estaActiva: true }),
      }),
    );
    expect(stock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        cantidadDisponible: '4.0000',
        cantidadReservada: '1.0000',
      }),
    );
    expect(movements.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoMovimiento: 'liberacion',
        cantidad: '2.0000',
      }),
    );
  });

  it('debe consumir unidad reservada e instalarla al resolver', async () => {
    const order = {
      id: 'rep-install',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
      fechaIngreso: new Date('2026-09-08T10:00:00Z'),
    };
    const part = {
      id: 'part-1',
      codigo: 'RAM-32',
      empresaId: user.empresaId,
      especificacionTipoActivoId: 'spec-1',
      esSerializado: true,
      unidad: 'GB',
      capacidad: '32',
      estaActiva: false,
    };
    const unit = {
      id: 'unit-1',
      piezaRepuestoId: 'part-1',
      estado: 'reservada',
      reparacionReservaId: order.id,
      numeroSerie: 'SER-1',
    };
    const oldUnit = {
      id: 'old-unit',
      piezaRepuestoId: 'part-old',
      estado: 'instalada',
      activoInstaladoId: order.activoId,
    };
    const units = repository({
      find: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(unit.estado === 'reservada' ? [unit] : []),
        ),
      findOne: jest
        .fn()
        .mockImplementation(({ where }) =>
          Promise.resolve(where.id === oldUnit.id ? oldUnit : unit),
        ),
    });
    const components = repository({
      findOne: jest.fn().mockResolvedValue({
        id: 'old-component',
        estado: 'instalado',
        unidadRepuestoId: oldUnit.id,
      }),
    });
    const attributes = repository({
      findOne: jest
        .fn()
        .mockResolvedValue({ clave: 'ram', valorTexto: '16', unidad: 'GB' }),
    });
    const history = repository();
    const repairs = repository({ findOne: jest.fn().mockResolvedValue(order) });
    const assets = repository({
      findOne: jest.fn().mockResolvedValue({
        id: 'asset-1',
        tipoActivoId: 'type-1',
        estado: 'en_reparacion',
      }),
    });
    const movementRows: any[] = [];
    const movements = repository({
      find: jest.fn().mockImplementation(() => Promise.resolve(movementRows)),
      save: jest.fn().mockImplementation(async (value) => {
        movementRows.push(value);
        return value;
      }),
    });
    const repos = new Map<unknown, any>([
      [ReparacionActivo, repairs],
      [
        PiezaRepuesto,
        repository({ findOne: jest.fn().mockResolvedValue(part) }),
      ],
      [UnidadRepuesto, units],
      [Activo, assets],
      [
        TiposActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'type-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [
        EspecificacionTipoActivo,
        repository({
          findOne: jest.fn().mockResolvedValue({
            id: 'spec-1',
            clave: 'ram',
            nombre: 'RAM',
            categoriaEquipoId: 'cat-1',
            unidad: 'GB',
          }),
        }),
      ],
      [ComponenteInstaladoActivo, components],
      [AtributosDinamicosActivo, attributes],
      [HistorialComponentesActivo, history],
      [MovimientoRepuesto, movements],
      [
        AsignacionRecurso,
        repository({ findOne: jest.fn().mockResolvedValue(null) }),
      ],
      [BitacoraAuditoriaSistema, repository()],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );

    await service.resolver(
      order.id,
      {
        resultado: 'resuelto',
        resolucion: 'Componente instalado',
        fechaSalida: '2026-09-09T10:00:00Z',
        cambiosComponentes: [],
      },
      user,
    );

    expect(repos.get(PiezaRepuesto).findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ estaActiva: true }),
      }),
    );
    expect(units.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'instalada',
        activoInstaladoId: order.activoId,
        reparacionReservaId: undefined,
      }),
    );
    expect(components.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'retirado',
        reparacionRetiroId: order.id,
      }),
    );
    expect(components.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'instalado',
        unidadRepuestoId: unit.id,
        reparacionInstalacionId: order.id,
      }),
    );
    expect(units.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: oldUnit.id,
        estado: 'defectuosa',
        activoInstaladoId: undefined,
        reparacionReservaId: undefined,
      }),
    );
    expect(movements.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoMovimiento: 'devolucion',
        unidadRepuestoId: oldUnit.id,
      }),
    );
    expect(history.save).toHaveBeenCalledWith(
      expect.objectContaining({ valorAnterior: '16', valorNuevo: '32' }),
    );
  });

  it('debe propagar el fallo transaccional sin cerrar la orden', async () => {
    const repairs = repository({
      findOne: jest.fn().mockResolvedValue({
        id: 'rep-rollback',
        empresaId: user.empresaId,
        activoId: 'asset-1',
        estado: 'en_proceso',
        fechaIngreso: new Date('2026-09-08T10:00:00Z'),
      }),
    });
    const repos = new Map<unknown, any>([
      [ReparacionActivo, repairs],
      [UnidadRepuesto, repository()],
      [
        MovimientoRepuesto,
        repository({
          find: jest.fn().mockResolvedValue([
            {
              piezaRepuestoId: 'missing-part',
              tipoMovimiento: 'reserva',
              cantidad: '1.0000',
            },
          ]),
        }),
      ],
      [
        PiezaRepuesto,
        repository({ findOne: jest.fn().mockResolvedValue(undefined) }),
      ],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );

    await expect(
      service.resolver(
        'rep-rollback',
        {
          resultado: 'resuelto',
          resolucion: 'No debe persistir',
          fechaSalida: '2026-09-09T10:00:00Z',
          cambiosComponentes: [],
        },
        user,
      ),
    ).rejects.toThrow('Pieza de repuesto no encontrada');
    expect(repairs.save).not.toHaveBeenCalled();
  });

  it('rechaza entradas cliente duplicadas o desactualizadas', async () => {
    const order = {
      id: 'rep-stale',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
      fechaIngreso: new Date('2026-09-08T10:00:00Z'),
    };
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [UnidadRepuesto, repository()],
      [
        MovimientoRepuesto,
        repository({
          find: jest.fn().mockResolvedValue([
            {
              piezaRepuestoId: 'part-1',
              tipoMovimiento: 'reserva',
              cantidad: '2.0000',
            },
          ]),
        }),
      ],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );
    await expect(
      service.resolver(
        order.id,
        {
          resultado: 'resuelto',
          resolucion: 'Salida válida',
          fechaSalida: '2026-09-09T10:00:00Z',
          cambiosComponentes: [],
          repuestosReservados: [
            { piezaRepuestoId: 'part-1', cantidad: '1' },
            { piezaRepuestoId: 'part-1', cantidad: '1' },
          ],
        },
        user,
      ),
    ).rejects.toThrow('duplicadas');
  });

  it('rechaza una lista cliente que omite parte de la reserva activa', async () => {
    const order = {
      id: 'rep-stale',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
      fechaIngreso: new Date('2026-09-08T10:00:00Z'),
    };
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [UnidadRepuesto, repository()],
      [
        MovimientoRepuesto,
        repository({
          find: jest.fn().mockResolvedValue([
            {
              piezaRepuestoId: 'part-1',
              tipoMovimiento: 'reserva',
              cantidad: '2.0000',
            },
          ]),
        }),
      ],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );
    await expect(
      service.resolver(
        order.id,
        {
          resultado: 'resuelto',
          resolucion: 'Salida válida',
          fechaSalida: '2026-09-09T10:00:00Z',
          cambiosComponentes: [],
          repuestosReservados: [],
        },
        user,
      ),
    ).rejects.toThrow('desactualizado');
  });

  it('restaura el estado previo del activo cuando no hay asignacion activa', async () => {
    const order = {
      id: 'rep-restore',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
      estadoActivoAnterior: 'disponible',
    };
    const asset = { id: order.activoId, estado: 'en_reparacion' };
    const assets = repository({ findOne: jest.fn().mockResolvedValue(asset) });
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [UnidadRepuesto, repository()],
      [MovimientoRepuesto, repository()],
      [Activo, assets],
      [
        AsignacionRecurso,
        repository({ findOne: jest.fn().mockResolvedValue(null) }),
      ],
      [BitacoraAuditoriaSistema, repository()],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );
    await service.remove(order.id, user);
    expect(assets.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'disponible' }),
    );
    expect(assets.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
    );
  });

  it('restaura asignado cuando existe una asignacion activa', async () => {
    const order = {
      id: 'rep-assigned',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
      estadoActivoAnterior: 'disponible',
    };
    const asset = { id: order.activoId, estado: 'en_reparacion' };
    const assets = repository({ findOne: jest.fn().mockResolvedValue(asset) });
    const repos = new Map<unknown, any>([
      [
        ReparacionActivo,
        repository({ findOne: jest.fn().mockResolvedValue(order) }),
      ],
      [UnidadRepuesto, repository()],
      [MovimientoRepuesto, repository()],
      [Activo, assets],
      [
        AsignacionRecurso,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ asignacionId: 'assignment-1' }),
        }),
      ],
      [
        Asignacion,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'assignment-1', estado: 'entregada' }),
        }),
      ],
      [BitacoraAuditoriaSistema, repository()],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );
    await service.remove(order.id, user);
    expect(assets.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'asignado' }),
    );
  });

  it('debe liberar reservas serializadas antes de cancelar la orden', async () => {
    const order = {
      id: 'rep-cancel',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      estado: 'en_proceso',
    };
    const part = {
      id: 'part-1',
      empresaId: user.empresaId,
      especificacionTipoActivoId: 'spec-1',
      esSerializado: true,
      estaActiva: true,
    };
    const unit = {
      id: 'unit-1',
      piezaRepuestoId: part.id,
      empresaId: user.empresaId,
      estado: 'reservada',
      reparacionReservaId: order.id,
    };
    const repairs = repository({ findOne: jest.fn().mockResolvedValue(order) });
    const units = repository({
      find: jest.fn().mockResolvedValue([unit]),
      findOne: jest.fn().mockResolvedValue(unit),
    });
    const movements = repository({ find: jest.fn().mockResolvedValue([]) });
    const assets = repository({
      findOne: jest.fn().mockResolvedValue({
        id: order.activoId,
        tipoActivoId: 'type-1',
        estado: 'en_reparacion',
      }),
    });
    const repos = new Map<unknown, any>([
      [ReparacionActivo, repairs],
      [
        PiezaRepuesto,
        repository({ findOne: jest.fn().mockResolvedValue(part) }),
      ],
      [UnidadRepuesto, units],
      [MovimientoRepuesto, movements],
      [Activo, assets],
      [
        TiposActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'type-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [
        EspecificacionTipoActivo,
        repository({
          findOne: jest
            .fn()
            .mockResolvedValue({ id: 'spec-1', categoriaEquipoId: 'cat-1' }),
        }),
      ],
      [
        AsignacionRecurso,
        repository({ findOne: jest.fn().mockResolvedValue(null) }),
      ],
      [BitacoraAuditoriaSistema, repository()],
    ]);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(workshopManager(repos)),
    );

    await service.remove(order.id, user);

    expect(units.save).toHaveBeenCalledWith(
      expect.objectContaining({
        estado: 'disponible',
        reparacionReservaId: undefined,
      }),
    );
    expect(movements.save).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoMovimiento: 'liberacion',
        unidadRepuestoId: unit.id,
      }),
    );
    expect(repairs.save).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'cancelada' }),
    );
  });
});
