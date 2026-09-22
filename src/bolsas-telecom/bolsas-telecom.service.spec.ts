import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BolsasTelecomService } from './bolsas-telecom.service';
import { BolsaTelecom } from './entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('BolsasTelecomService', () => {
  let service: BolsasTelecomService;
  const bolsasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BolsasTelecomService,
        {
          provide: getRepositoryToken(BolsaTelecom),
          useValue: bolsasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<BolsasTelecomService>(BolsasTelecomService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear bolsa y registrar bitacora', async () => {
    const dto = {
      alcance: 'global',
      tipoBolsa: 'datos',
      unidad: 'gb',
      iniciaEn: '2026-09-08T00:00:00.000Z',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    const creada = {
      id: 'bol-1',
      ...dto,
      estado: 'activa',
      iniciaEn: new Date(dto.iniciaEn),
    };
    bolsasRepositoryMock.create.mockReturnValue(creada);
    bolsasRepositoryMock.save.mockResolvedValue(creada);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'bol-1', tipoBolsa: 'datos' });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('lista bolsas solo del tenant autenticado', async () => {
    bolsasRepositoryMock.find.mockResolvedValue([{ id: 'bol-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(bolsasRepositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  });

  it('rechaza acceso a una bolsa de otro tenant', async () => {
    bolsasRepositoryMock.findOne.mockResolvedValue(null);
    await expect(service.findOne('bolsa-tenant-b', user)).rejects.toThrow(
      'no encontrada',
    );
  });

  it('rechaza unidad invalida para tipo de bolsa', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });

    await expect(
      service.create(
        {
          alcance: 'global',
          tipoBolsa: 'datos',
          unidad: 'minutos',
          iniciaEn: '2026-09-08T00:00:00.000Z',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza bolsa linea cuando linea no pertenece al tenant', async () => {
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    lineasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          alcance: 'linea',
          lineaTelefonicaId: 'linea-tenant-b',
          tipoBolsa: 'datos',
          unidad: 'gb',
          iniciaEn: '2026-09-08T00:00:00.000Z',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancela bolsa en remove (baja logica)', async () => {
    const bolsa = {
      id: 'bol-1',
      empresaId: user.empresaId,
      alcance: 'global',
      tipoBolsa: 'datos',
      unidad: 'gb',
      estado: 'activa',
      iniciaEn: new Date('2026-09-08T00:00:00.000Z'),
    };

    bolsasRepositoryMock.findOne.mockResolvedValue(bolsa);
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    bolsasRepositoryMock.save.mockResolvedValue({ ...bolsa, estado: 'cancelada' });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('bol-1', user);

    expect(bolsasRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bol-1',
        estado: 'cancelada',
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });
});
