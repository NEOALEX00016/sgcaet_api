import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FormularioRespuestasService } from './formulario-respuestas.service';
import { FormularioRespuesta } from './entities/formulario-respuesta.entity';
import { FormularioRespuestaDetalle } from './entities/formulario-respuesta-detalle.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Evidencia } from '../evidencias/entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DataSource } from 'typeorm';
import { FormularioReparacion } from '../formularios-reparacion/entities/formularios-reparacion.entity';

describe('FormularioRespuestasService', () => {
  let service: FormularioRespuestasService;
  const respuestasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const detallesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const versionesRepositoryMock = { findOne: jest.fn() };
  const camposRepositoryMock = { find: jest.fn() };
  const reglasRepositoryMock = { find: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const evidenciasRepositoryMock = { find: jest.fn(), save: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const formulariosReparacionRepositoryMock = { findOne: jest.fn() };
  const dataSourceMock = { transaction: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FormularioRespuestasService,
        {
          provide: getRepositoryToken(FormularioRespuesta),
          useValue: respuestasRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioRespuestaDetalle),
          useValue: detallesRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioVersione),
          useValue: versionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioCampo),
          useValue: camposRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioRegla),
          useValue: reglasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Evidencia),
          useValue: evidenciasRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        {
          provide: getRepositoryToken(FormularioReparacion),
          useValue: formulariosReparacionRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<FormularioRespuestasService>(
      FormularioRespuestasService,
    );
    jest.clearAllMocks();
    formulariosReparacionRepositoryMock.findOne.mockResolvedValue(null);
  });

  it('debe rechazar version no publicada', async () => {
    const dto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      formularioVersionId: '33333333-3333-3333-3333-333333333333',
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
      usuarioActorId: '22222222-2222-2222-2222-222222222222',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: dto.usuarioActorId,
    });
    camposRepositoryMock.find.mockResolvedValue([]);
    reglasRepositoryMock.find.mockResolvedValue([]);
    versionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.formularioVersionId,
      estado: 'borrador',
    });

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar respondidoPor de otro tenant o inexistente', async () => {
    const dto = {
      formularioVersionId: '33333333-3333-3333-3333-333333333333',
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
      respondidoPor: '55555555-5555-5555-5555-555555555555',
    };

    versionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.formularioVersionId,
      empresaId: '11111111-1111-1111-1111-111111111111',
      estado: 'publicada',
    });
    camposRepositoryMock.find.mockResolvedValue([]);
    reglasRepositoryMock.find.mockResolvedValue([]);
    usuariosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('findAll aplica filtros por entidad, entidadId y version', async () => {
    respuestasRepositoryMock.find.mockResolvedValue([{ id: 'resp-1' }]);

    const result = await service.findAll(
      {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      },
      {
        entidadRelacionada: 'asignaciones',
        entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
        formularioVersionId: '33333333-3333-3333-3333-333333333333',
      },
    );

    expect(result).toEqual([{ id: 'resp-1' }]);
    expect(respuestasRepositoryMock.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          empresaId: '11111111-1111-1111-1111-111111111111',
          entidadRelacionada: 'asignaciones',
          entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
          formularioVersionId: '33333333-3333-3333-3333-333333333333',
        },
      }),
    );
  });

  it('bloquea actualizar una respuesta usada por un formulario de taller completado', async () => {
    const actual = {
      id: 'response-1',
      empresaId: '11111111-1111-1111-1111-111111111111',
      formularioVersionId: '33333333-3333-3333-3333-333333333333',
      respondidoEn: new Date(),
    };
    const transactionRepository = {
      ...respuestasRepositoryMock,
      findOne: jest.fn().mockResolvedValue(actual),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === FormularioRespuesta
          ? transactionRepository
          : entity === FormularioReparacion
            ? formulariosReparacionRepositoryMock
            : detallesRepositoryMock,
      ),
    };
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(manager),
    );
    formulariosReparacionRepositoryMock.findOne.mockResolvedValue({
      id: 'instance-1',
      estado: 'completado',
    });

    await expect(
      service.update('response-1', { detalles: [] }, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: actual.empresaId,
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionRepository.save).not.toHaveBeenCalled();
  });

  it('bloquea eliminar una respuesta usada por un formulario de taller completado', async () => {
    const actual = {
      id: 'response-1',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const transactionRepository = {
      ...respuestasRepositoryMock,
      findOne: jest.fn().mockResolvedValue(actual),
    };
    const manager = {
      getRepository: jest.fn((entity) =>
        entity === FormularioRespuesta
          ? transactionRepository
          : formulariosReparacionRepositoryMock,
      ),
    };
    dataSourceMock.transaction.mockImplementation((callback) =>
      callback(manager),
    );
    formulariosReparacionRepositoryMock.findOne.mockResolvedValue({
      id: 'instance-1',
      estado: 'completado',
    });

    await expect(
      service.remove('response-1', {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: actual.empresaId,
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transactionRepository.delete).not.toHaveBeenCalled();
  });

  it('rechaza create cuando falta campo obligatorio', async () => {
    const dto = {
      formularioVersionId: '33333333-3333-3333-3333-333333333333',
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
      detalles: [],
    };

    versionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.formularioVersionId,
      empresaId: '11111111-1111-1111-1111-111111111111',
      estado: 'publicada',
    });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    });
    camposRepositoryMock.find.mockResolvedValue([
      {
        id: 'campo-1',
        clave: 'telefono',
        etiqueta: 'Telefono corporativo',
        requerido: true,
      },
    ]);
    reglasRepositoryMock.find.mockResolvedValue([]);

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza create cuando regla obliga campo destino sin respuesta', async () => {
    const dto = {
      formularioVersionId: '33333333-3333-3333-3333-333333333333',
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: '44444444-4444-4444-4444-444444444444',
      detalles: [
        {
          campoClave: 'tipoEntrega',
          valorTexto: 'presencial',
        },
      ],
    };

    versionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.formularioVersionId,
      empresaId: '11111111-1111-1111-1111-111111111111',
      estado: 'publicada',
    });
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    });
    camposRepositoryMock.find.mockResolvedValue([
      {
        id: 'campo-origen',
        clave: 'tipoEntrega',
        etiqueta: 'Tipo de entrega',
        requerido: false,
      },
      {
        id: 'campo-destino',
        clave: 'direccionEntrega',
        etiqueta: 'Direccion de entrega',
        requerido: false,
      },
    ]);
    reglasRepositoryMock.find.mockResolvedValue([
      {
        campoOrigenId: 'campo-origen',
        operador: 'equals',
        valorEsperado: 'presencial',
        accion: 'obligatorio',
        campoDestinoId: 'campo-destino',
      },
    ]);

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
