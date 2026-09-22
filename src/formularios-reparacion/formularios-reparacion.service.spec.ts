import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { FormulariosReparacionService } from './formularios-reparacion.service';
import { FormularioReparacion } from './entities/formularios-reparacion.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { PoliticasFormularioTallerService } from '../politicas-formulario-taller/politicas-formulario-taller.service';
import { FormularioRespuestasService } from '../formulario-respuestas/formulario-respuestas.service';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { Ubicacione } from '../ubicaciones/entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';

describe('FormulariosReparacionService', () => {
  const instances = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => v),
  };
  const repairs = { findOne: jest.fn() };
  const assets = { findOne: jest.fn() };
  const types = { findOne: jest.fn() };
  const versions = { findOne: jest.fn() };
  const assignments = { findOne: jest.fn() };
  const people = { findOne: jest.fn() };
  const departments = { findOne: jest.fn() };
  const locations = { findOne: jest.fn() };
  const users = { findOne: jest.fn() };
  const attributes = { find: jest.fn() };
  const definitions = { find: jest.fn() };
  const policies = { resolve: jest.fn() };
  const responses = { createFromFrozenVersion: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  let service: FormulariosReparacionService;
  const user = { empresaId: 'tenant-1', userId: 'user-1', correo: 'a@b.test' };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        FormulariosReparacionService,
        {
          provide: getRepositoryToken(FormularioReparacion),
          useValue: instances,
        },
        { provide: getRepositoryToken(ReparacionActivo), useValue: repairs },
        { provide: getRepositoryToken(Activo), useValue: assets },
        { provide: getRepositoryToken(TiposActivo), useValue: types },
        { provide: getRepositoryToken(FormularioVersione), useValue: versions },
        { provide: getRepositoryToken(Asignacion), useValue: assignments },
        { provide: getRepositoryToken(Persona), useValue: people },
        { provide: getRepositoryToken(Departamento), useValue: departments },
        { provide: getRepositoryToken(Ubicacione), useValue: locations },
        { provide: getRepositoryToken(Usuario), useValue: users },
        {
          provide: getRepositoryToken(AtributosDinamicosActivo),
          useValue: attributes,
        },
        {
          provide: getRepositoryToken(EspecificacionTipoActivo),
          useValue: definitions,
        },
        { provide: PoliticasFormularioTallerService, useValue: policies },
        { provide: FormularioRespuestasService, useValue: responses },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();
    service = module.get(FormulariosReparacionService);
    jest.clearAllMocks();
    repairs.findOne.mockResolvedValue({
      id: 'repair-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      tipoServicio: 'reparacion',
      estado: 'abierta',
      fechaIngreso: new Date('2026-09-22T10:00:00Z'),
      diagnostico: 'No enciende',
    });
    assets.findOne.mockResolvedValue({
      id: 'asset-1',
      empresaId: user.empresaId,
      tipoActivoId: 'type-1',
      codigoActivo: 'INV-1',
      nombre: 'Laptop',
      estado: 'reparacion',
    });
    types.findOne.mockResolvedValue({
      id: 'type-1',
      empresaId: user.empresaId,
      categoriaEquipoId: 'category-1',
      nombre: 'Portatil',
    });
    assignments.findOne.mockResolvedValue(null);
    people.findOne.mockResolvedValue(null);
    departments.findOne.mockResolvedValue(null);
    locations.findOne.mockResolvedValue(null);
    users.findOne.mockResolvedValue(null);
    attributes.find.mockResolvedValue([]);
    definitions.find.mockResolvedValue([]);
  });

  it('congela la version publicada mas reciente al preparar', async () => {
    instances.findOne.mockResolvedValue(null);
    policies.resolve.mockResolvedValue({
      formularioId: 'form-1',
      esObligatoria: true,
    });
    versions.findOne.mockResolvedValue({ id: 'version-3', versionNumero: 3 });
    await service.prepare('repair-1', 'entrada', user);
    expect(versions.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ order: { versionNumero: 'DESC' } }),
    );
    expect(instances.create).toHaveBeenCalledWith(
      expect.objectContaining({
        formularioVersionId: 'version-3',
        estado: 'pendiente',
      }),
    );
  });

  it('devuelve motivo explicito cuando no existe politica efectiva', async () => {
    repairs.findOne.mockResolvedValue({
      id: 'repair-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      tipoServicio: 'mantenimiento',
      estado: 'en_proceso',
    });
    instances.findOne.mockResolvedValue(null);
    policies.resolve.mockResolvedValue(undefined);

    await expect(service.prepare('repair-1', 'entrada', user)).resolves.toEqual({
      prepared: false,
      etapa: 'entrada',
      tipoServicio: 'mantenimiento',
      reason: 'No existe una política activa para mantenimiento / entrada',
    });
  });

  it('enriquece el listado con aliases tenant-scoped y valores dinamicos actuales', async () => {
    repairs.findOne.mockResolvedValue({
      id: 'repair-1',
      empresaId: user.empresaId,
      activoId: 'asset-1',
      asignacionId: 'assignment-1',
      tipoServicio: 'reparacion',
      estado: 'cerrada',
      fechaIngreso: new Date('2026-09-20T08:00:00Z'),
      fechaSalida: new Date('2026-09-22T18:00:00Z'),
      diagnostico: 'Falla de disco',
      resolucion: 'Disco sustituido',
      costo: '125.50',
      moneda: 'USD',
    });
    assignments.findOne.mockResolvedValue({
      id: 'assignment-1',
      empresaId: user.empresaId,
      personaId: 'person-1',
      ubicacionId: 'location-1',
      motivo: 'Asignacion operativa',
    });
    people.findOne.mockResolvedValue({ nombres: 'Ada', apellidos: 'Lovelace' });
    locations.findOne.mockResolvedValue({ nombre: 'Sede Norte', direccion: 'Calle 1' });
    users.findOne.mockResolvedValue({ nombres: 'Grace', apellidos: 'Hopper' });
    attributes.find.mockResolvedValue([{ clave: 'ram', valorNumero: '16', unidad: 'GB' }]);
    definitions.find.mockResolvedValue([
      { clave: 'ram', nombre: 'Memoria RAM' },
      { clave: 'color', nombre: 'Color' },
    ]);
    instances.find.mockResolvedValue([
      { id: 'instance-1', etapa: 'salida', formularioVersionId: 'version-1' },
    ]);

    const result = await service.findByRepair('repair-1', user);

    expect(result[0].valoresIniciales).toMatchObject({
      fecha_salida: '2026-09-22',
      usuario_nombre: 'Ada Lovelace',
      direccion: 'Calle 1',
      diagnostico: 'Falla de disco',
      solucion_aplicada: 'Disco sustituido',
      costo: 125.5,
      ram: 16,
      color: '',
      capacidades_equipo: 'Memoria RAM: 16 GB',
      entregado_por: 'Grace Hopper',
    });
    expect(assignments.findOne).toHaveBeenCalledWith({
      where: { id: 'assignment-1', empresaId: user.empresaId },
    });
    expect(attributes.find).toHaveBeenCalledWith({
      where: { activoId: 'asset-1', empresaId: user.empresaId },
    });
    expect(definitions.find).toHaveBeenCalledWith({
      where: expect.arrayContaining([
        expect.objectContaining({ empresaId: user.empresaId }),
      ]),
    });
  });

  it('bloquea completar por segunda vez', async () => {
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 'instance-1', estado: 'completado' }),
      }),
    };
    dataSource.transaction.mockImplementation((callback) => callback(manager));
    await expect(
      service.complete('repair-1', 'instance-1', {}, user),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(responses.createFromFrozenVersion).not.toHaveBeenCalled();
  });

  it('completa la instancia vinculada a la orden en una transaccion', async () => {
    const instance = {
      id: 'instance-1',
      empresaId: user.empresaId,
      reparacionActivoId: 'repair-1',
      formularioVersionId: 'version-1',
      estado: 'pendiente',
    };
    const transactionInstances = {
      findOne: jest.fn().mockResolvedValue(instance),
      save: jest.fn((value) => Promise.resolve(value)),
    };
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity === FormularioReparacion) return transactionInstances;
        if (entity === ReparacionActivo) return repairs;
        if (entity === Activo) return assets;
        return types;
      }),
    };
    dataSource.transaction.mockImplementation((callback) => callback(manager));
    responses.createFromFrozenVersion.mockResolvedValue({ id: 'response-1' });

    const result = await service.complete(
      'repair-1',
      'instance-1',
      { detalles: [] },
      user,
    );

    expect(responses.createFromFrozenVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        formularioVersionId: 'version-1',
        entidadRelacionada: 'formularios_reparacion',
        entidadRelacionadaId: 'instance-1',
      }),
      user,
      manager,
    );
    expect(result).toMatchObject({
      estado: 'completado',
      formularioRespuestaId: 'response-1',
    });
    expect(responses.createFromFrozenVersion.mock.calls[0][0]).not.toHaveProperty(
      'respondidoPor',
    );
    expect(responses.createFromFrozenVersion.mock.calls[0][0]).not.toHaveProperty(
      'respondidoEn',
    );
    expect(responses.createFromFrozenVersion.mock.calls[0][0]).not.toHaveProperty(
      'firmaUrl',
    );
  });

  it('no bloquea si no existe politica obligatoria', async () => {
    policies.resolve.mockResolvedValue(undefined);
    await expect(
      service.assertRequiredComplete(
        {
          id: 'repair-1',
          activoId: 'asset-1',
          tipoServicio: 'reparacion',
        } as ReparacionActivo,
        'salida',
        user.empresaId,
      ),
    ).resolves.toBeUndefined();
  });

  it('bloquea una etapa obligatoria pendiente', async () => {
    policies.resolve.mockResolvedValue({ esObligatoria: true });
    instances.findOne.mockResolvedValue({
      id: 'instance-1',
      estado: 'pendiente',
    });
    await expect(
      service.assertRequiredComplete(
        {
          id: 'repair-1',
          activoId: 'asset-1',
          tipoServicio: 'reparacion',
        } as ReparacionActivo,
        'salida',
        user.empresaId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
