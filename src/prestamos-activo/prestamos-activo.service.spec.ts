import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { PrestamosActivoService } from './prestamos-activo.service';
import { PrestamoActivo } from './entities/prestamos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PrestamosActivoService', () => {
  let service: PrestamosActivoService;
  const user = {
    userId: '44444444-4444-4444-4444-444444444444',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const prestamosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const activosRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrestamosActivoService,
        {
          provide: getRepositoryToken(PrestamoActivo),
          useValue: prestamosRepositoryMock,
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
      ],
    }).compile();

    service = module.get<PrestamosActivoService>(PrestamosActivoService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear prestamo y registrar bitacora', async () => {
    const dto = {
      activoId: '22222222-2222-2222-2222-222222222222',
      personaId: '33333333-3333-3333-3333-333333333333',
      fechaSalida: '2026-09-08T10:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId });
    const creado = {
      id: 'pre-1',
      ...dto,
      estado: 'prestado',
      fechaSalida: new Date(dto.fechaSalida),
    };
    prestamosRepositoryMock.create.mockReturnValue(creado);
    prestamosRepositoryMock.save.mockResolvedValue(creado);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'pre-1', estado: 'prestado' });
  });

  it('debe rechazar prestamo si el activo ya tiene prestamo vigente', async () => {
    const dto = {
      activoId: '22222222-2222-2222-2222-222222222222',
      personaId: '33333333-3333-3333-3333-333333333333',
      fechaSalida: '2026-09-08T10:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId });
    prestamosRepositoryMock.findOne.mockResolvedValue({
      id: 'pre-vigente',
      activoId: dto.activoId,
      estado: 'prestado',
    });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debe registrar retorno y marcar estado devuelto', async () => {
    const actual = {
      id: 'pre-2',
      empresaId: user.empresaId,
      activoId: 'activo-1',
      estado: 'prestado',
      fechaSalida: new Date('2026-09-08T10:00:00.000Z'),
      fechaRetornoReal: undefined,
      fechaPrevistaRetorno: new Date('2026-09-09T10:00:00.000Z'),
    };

    prestamosRepositoryMock.findOne.mockResolvedValue(actual);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    prestamosRepositoryMock.merge.mockReturnValue({
      ...actual,
      fechaRetornoReal: new Date('2026-09-09T11:00:00.000Z'),
      estado: 'prestado',
    });
    prestamosRepositoryMock.save.mockResolvedValue({
      ...actual,
      fechaRetornoReal: new Date('2026-09-09T11:00:00.000Z'),
      estado: 'devuelto',
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-ret-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-ret-1' });

    const result = await service.update(
      'pre-2',
      { fechaRetornoReal: '2026-09-09T11:00:00.000Z' },
      user,
    );

    expect(result.estado).toBe('devuelto');
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
