import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ActivosService } from './activos.service';
import { Activo } from './entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

describe('ActivosService', () => {
  let service: ActivosService;
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const activosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const asignacionRecursosRepositoryMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivosService,
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
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: asignacionRecursosRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<ActivosService>(ActivosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear activo y registrar bitacora', async () => {
    const dto = {
      tipoActivoId: '33333333-3333-3333-3333-333333333333',
      codigoActivo: 'LAP-001',
      nombre: 'Laptop Operaciones',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    const created = {
      id: 'act-1',
      ...dto,
      estado: 'registrado',
      estaActivo: true,
    };

    activosRepositoryMock.create.mockReturnValue(created);
    activosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(activosRepositoryMock.create).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'act-1', codigoActivo: 'LAP-001' });
  });

  it('no permite leer un activo de otro tenant', async () => {
    activosRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(service.findOne('act-foreign', user)).rejects.toThrow(
      'no encontrado',
    );
    expect(activosRepositoryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ empresaId: user.empresaId }),
      }),
    );
  });

  it('impide desactivar un activo con asignacion activa', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: 'act-1',
      empresaId: user.empresaId,
      estado: 'disponible',
      estaActivo: true,
      deletedAt: null,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValue({
      id: 'ar-1',
      activoId: 'act-1',
      estaActivo: true,
    });

    await expect(service.remove('act-1', user)).rejects.toThrow(
      'No se puede desactivar el activo porque tiene una asignación activa.',
    );
  });
});
