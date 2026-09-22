import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CambiosEquipoService } from './cambios-equipo.service';
import { CambioEquipo } from './entities/cambios-equipo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

describe('CambiosEquipoService', () => {
  let service: CambiosEquipoService;
  const user = {
    userId: '55555555-5555-5555-5555-555555555555',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };

  const cambiosEquipoRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const asignacionesRepositoryMock = { findOne: jest.fn() };
  const asignacionRecursosRepositoryMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const activosRepositoryMock = { findOne: jest.fn(), save: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const documentsRepositoryMock = { findOne: jest.fn() };
  const dataSourceMock = {
    transaction: jest.fn(async (work) =>
      work({
        getRepository: (entity) => {
          if (entity === CambioEquipo) return cambiosEquipoRepositoryMock;
          if (entity === Asignacion) return asignacionesRepositoryMock;
          if (entity === AsignacionRecurso) return asignacionRecursosRepositoryMock;
          if (entity === Activo) return activosRepositoryMock;
          if (entity === Usuario) return usuariosRepositoryMock;
          if (entity === BitacoraAuditoriaSistema) return bitacoraRepositoryMock;
          if (entity === DocumentEntity) return documentsRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CambiosEquipoService,
        {
          provide: getRepositoryToken(CambioEquipo),
          useValue: cambiosEquipoRepositoryMock,
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
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentsRepositoryMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<CambiosEquipoService>(CambiosEquipoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe registrar cambio pendiente sin reemplazar recurso activo', async () => {
    const dto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      asignacionId: '22222222-2222-2222-2222-222222222222',
      activoAnteriorId: '33333333-3333-3333-3333-333333333333',
      activoNuevoId: '44444444-4444-4444-4444-444444444444',
      motivo: 'Reemplazo por mantenimiento',
      usuarioActorId: '55555555-5555-5555-5555-555555555555',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoAnteriorId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.activoAnteriorId })
      .mockResolvedValueOnce({ id: dto.activoNuevoId });

    asignacionRecursosRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'res-anterior',
        estaActivo: true,
        activoId: dto.activoAnteriorId,
      })
      .mockResolvedValueOnce(null);

    const creado = {
      id: 'cam-1',
      ...dto,
      ejecutadoEn: new Date('2026-09-08T10:00:00.000Z'),
    };
    cambiosEquipoRepositoryMock.create.mockReturnValue(creado);
    cambiosEquipoRepositoryMock.save.mockResolvedValue(creado);
    asignacionRecursosRepositoryMock.create.mockReturnValue({
      id: 'res-nuevo',
      activoId: dto.activoNuevoId,
      estaActivo: true,
    });
    asignacionRecursosRepositoryMock.save.mockResolvedValue({});
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(result).toMatchObject({
      id: 'cam-1',
      activoNuevoId: dto.activoNuevoId,
    });
    expect(asignacionRecursosRepositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('conserva el recurso activo hasta confirmar el acta firmada', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      activoAnteriorId: '33333333-3333-3333-3333-333333333333',
      activoNuevoId: '44444444-4444-4444-4444-444444444444',
      motivo: 'Reemplazo operativo',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.activoAnteriorId })
      .mockResolvedValueOnce({ id: dto.activoNuevoId });

    const recursoAnterior = {
      id: 'res-anterior',
      estaActivo: true,
      activoId: dto.activoAnteriorId,
    };

    asignacionRecursosRepositoryMock.findOne
      .mockResolvedValueOnce(recursoAnterior)
      .mockResolvedValueOnce(null);

    cambiosEquipoRepositoryMock.create.mockReturnValue({
      id: 'cam-hist-1',
      ...dto,
      ejecutadoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    cambiosEquipoRepositoryMock.save.mockResolvedValue({
      id: 'cam-hist-1',
      ...dto,
      ejecutadoEn: new Date('2026-09-08T10:00:00.000Z'),
    });
    asignacionRecursosRepositoryMock.create.mockReturnValue({
      id: 'res-nuevo',
      activoId: dto.activoNuevoId,
      estaActivo: true,
    });
    asignacionRecursosRepositoryMock.save.mockResolvedValue({});
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-hist-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-hist-1' });

    await service.create(dto as any, user);

    expect(recursoAnterior.estaActivo).toBe(true);
    expect(asignacionRecursosRepositoryMock.create).not.toHaveBeenCalled();
    expect(asignacionRecursosRepositoryMock.save).not.toHaveBeenCalled();
  });

  it('debe rechazar si activo anterior y nuevo son iguales', async () => {
    await expect(
      service.create(
        {
          asignacionId: '22222222-2222-2222-2222-222222222222',
          activoAnteriorId: '33333333-3333-3333-3333-333333333333',
          activoNuevoId: '33333333-3333-3333-3333-333333333333',
          motivo: 'No aplica',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('no intenta activar recurso nuevo durante la preparacion documental', async () => {
    const dto = {
      empresaId: '11111111-1111-1111-1111-111111111111',
      asignacionId: '22222222-2222-2222-2222-222222222222',
      activoAnteriorId: '33333333-3333-3333-3333-333333333333',
      activoNuevoId: '44444444-4444-4444-4444-444444444444',
      motivo: 'Reemplazo por mantenimiento',
      usuarioActorId: '55555555-5555-5555-5555-555555555555',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.activoAnteriorId })
      .mockResolvedValueOnce({ id: dto.activoNuevoId });
    asignacionRecursosRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'res-anterior',
        estaActivo: true,
        activoId: dto.activoAnteriorId,
      })
      .mockResolvedValueOnce(null);

    const cambioCreado = {
      id: 'cam-2',
      ...dto,
      ejecutadoEn: new Date('2026-09-08T10:00:00.000Z'),
    };
    cambiosEquipoRepositoryMock.create.mockReturnValue(cambioCreado);
    cambiosEquipoRepositoryMock.save.mockResolvedValue(cambioCreado);

    let saveCall = 0;
    asignacionRecursosRepositoryMock.create.mockReturnValue({
      id: 'res-nuevo',
      activoId: dto.activoNuevoId,
      estaActivo: true,
    });
    asignacionRecursosRepositoryMock.save.mockImplementation(async () => {
      saveCall += 1;
      if (saveCall >= 2) {
        throw new Error('db fail');
      }
      return {};
    });

    await expect(service.create(dto, user)).resolves.toMatchObject({ id: 'cam-2' });
    expect(asignacionRecursosRepositoryMock.save).not.toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
