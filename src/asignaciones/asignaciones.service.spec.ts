import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AsignacionesService } from './asignaciones.service';
import { Asignacion } from './entities/asignacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { ActaAsignacion } from '../actas-asignacion/entities/acta-asignacion.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';

describe('AsignacionesService', () => {
  let service: AsignacionesService;
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const asignacionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const actasRepositoryMock = { find: jest.fn() };
  const recursosRepositoryMock = { find: jest.fn(), save: jest.fn() };
  const activosRepositoryMock = { find: jest.fn(), save: jest.fn() };
  const dataSourceMock = {
    transaction: jest.fn(async (work) =>
      work({
        getRepository: (entity) => {
          if (entity === Asignacion) return asignacionesRepositoryMock;
          if (entity === Usuario) return usuariosRepositoryMock;
          if (entity === BitacoraAuditoriaSistema) return bitacoraRepositoryMock;
          if (entity === ActaAsignacion) return actasRepositoryMock;
          if (entity === AsignacionRecurso) return recursosRepositoryMock;
          if (entity === Activo) return activosRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionesService,
        {
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
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
          provide: getRepositoryToken(ActaAsignacion),
          useValue: actasRepositoryMock,
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: recursosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<AsignacionesService>(AsignacionesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear asignacion y registrar bitacora', async () => {
    const dto = {
      personaId: '33333333-3333-3333-3333-333333333333',
      fechaAsignacion: '2026-09-08T00:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    const created = {
      id: 'asg-1',
      ...dto,
      estado: 'borrador',
      fechaAsignacion: new Date(dto.fechaAsignacion),
    };
    asignacionesRepositoryMock.create.mockReturnValue(created);
    asignacionesRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(asignacionesRepositoryMock.create).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'asg-1', estado: 'borrador' });
  });

  it('debe rechazar transicion invalida de estado', async () => {
    const actual = {
      id: 'asg-2',
      empresaId: '11111111-1111-1111-1111-111111111111',
      estado: 'borrador',
      fechaAsignacion: new Date('2026-09-08T00:00:00.000Z'),
    };

    asignacionesRepositoryMock.findOne.mockResolvedValue(actual);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(
      service.update(
        'asg-2',
        {
          estado: 'entregada',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar asignacion sin receptor objetivo', async () => {
    const dto = {
      fechaAsignacion: '2026-09-08T00:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(service.create(dto as any, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debe rechazar fecha prevista de devolucion anterior a la asignacion', async () => {
    const dto = {
      personaId: '33333333-3333-3333-3333-333333333333',
      fechaAsignacion: '2026-09-10T00:00:00.000Z',
      fechaPrevistaDevolucion: '2026-09-09T00:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no permite leer una asignacion de otro tenant', async () => {
    asignacionesRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(service.findOne('asg-foreign', user)).rejects.toThrow(
      'no encontrada',
    );
    expect(asignacionesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'asg-foreign', empresaId: user.empresaId },
    });
  });
});
