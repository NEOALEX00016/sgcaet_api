import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DevolucionesService } from './devoluciones.service';
import { Devolucion } from './entities/devolucione.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Activo } from '../activos/entities/activo.entity';

describe('DevolucionesService', () => {
  let service: DevolucionesService;
  const user = {
    userId: '33333333-3333-3333-3333-333333333333',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const devolucionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const asignacionesRepositoryMock = { findOne: jest.fn(), save: jest.fn() };
  const asignacionRecursosRepositoryMock = { find: jest.fn(), save: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const documentsRepositoryMock = { findOne: jest.fn() };
  const activosRepositoryMock = { find: jest.fn(), save: jest.fn() };
  const dataSourceMock = {
    transaction: jest.fn(async (work) =>
      work({
        getRepository: (entity) => {
          if (entity === Devolucion) return devolucionesRepositoryMock;
          if (entity === Asignacion) return asignacionesRepositoryMock;
          if (entity === AsignacionRecurso) return asignacionRecursosRepositoryMock;
          if (entity === Usuario) return usuariosRepositoryMock;
          if (entity === BitacoraAuditoriaSistema) return bitacoraRepositoryMock;
          if (entity === DocumentEntity) return documentsRepositoryMock;
          if (entity === Activo) return activosRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DevolucionesService,
        {
          provide: getRepositoryToken(Devolucion),
          useValue: devolucionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: asignacionRecursosRepositoryMock,
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
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentsRepositoryMock,
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

    service = module.get<DevolucionesService>(DevolucionesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear devolucion pendiente sin cerrar asignacion', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      condicionActivo: 'correcto',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
      estado: 'entregada',
    });
    devolucionesRepositoryMock.findOne.mockResolvedValue(null);
    devolucionesRepositoryMock.create.mockReturnValue({
      id: 'dev-1',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    devolucionesRepositoryMock.save.mockResolvedValue({
      id: 'dev-1',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    asignacionesRepositoryMock.save.mockResolvedValue({});
    asignacionRecursosRepositoryMock.find.mockResolvedValue([
      { id: 'res-1', estaActivo: true },
    ]);
    asignacionRecursosRepositoryMock.save.mockResolvedValue({});
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'dev-1', condicionActivo: 'correcto' });
    expect(asignacionesRepositoryMock.save).not.toHaveBeenCalled();
    expect(asignacionRecursosRepositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('no libera recursos hasta confirmar el recibo firmado', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      condicionActivo: 'correcto',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
      estado: 'entregada',
    });
    devolucionesRepositoryMock.findOne.mockResolvedValue(null);
    devolucionesRepositoryMock.create.mockReturnValue({
      id: 'dev-3',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    devolucionesRepositoryMock.save.mockResolvedValue({
      id: 'dev-3',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    asignacionesRepositoryMock.save.mockResolvedValue({});
    const recursoA = { id: 'res-a', estaActivo: true };
    const recursoB = { id: 'res-b', estaActivo: true };
    asignacionRecursosRepositoryMock.find.mockResolvedValue([recursoA, recursoB]);
    asignacionRecursosRepositoryMock.save.mockResolvedValue({});
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-3' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-3' });

    await service.create(dto, user);

    expect(asignacionRecursosRepositoryMock.save).not.toHaveBeenCalled();
    expect(recursoA.estaActivo).toBe(true);
    expect(recursoB.estaActivo).toBe(true);
  });

  it('debe rechazar devolucion si la asignacion no esta entregada', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      condicionActivo: 'correcto',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
      estado: 'autorizada',
    });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('no intenta cerrar asignacion durante la preparacion documental', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      condicionActivo: 'correcto',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
      estado: 'entregada',
    });
    devolucionesRepositoryMock.findOne.mockResolvedValue(null);
    devolucionesRepositoryMock.create.mockReturnValue({
      id: 'dev-2',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    devolucionesRepositoryMock.save.mockResolvedValue({
      id: 'dev-2',
      ...dto,
      recibidoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    asignacionesRepositoryMock.save.mockRejectedValue(new Error('db fail'));

    await expect(service.create(dto, user)).resolves.toMatchObject({ id: 'dev-2' });
    expect(asignacionesRepositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
