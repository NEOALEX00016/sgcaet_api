import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { IdentificadoresQrActivoService } from './identificadores-qr-activo.service';
import { IdentificadoresQrActivo } from './entities/identificadores-qr-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('IdentificadoresQrActivoService', () => {
  let service: IdentificadoresQrActivoService;
  const identificadoresRepositoryMock = {
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
        IdentificadoresQrActivoService,
        {
          provide: getRepositoryToken(IdentificadoresQrActivo),
          useValue: identificadoresRepositoryMock,
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

    service = module.get<IdentificadoresQrActivoService>(
      IdentificadoresQrActivoService,
    );
    jest.resetAllMocks();
  });

  it('rechaza codigo QR duplicado', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      activoId: '33333333-3333-3333-3333-333333333333',
      codigoQr: 'QR-ABC-001',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoId,
      empresaId: user.empresaId,
    });
    identificadoresRepositoryMock.findOne.mockResolvedValue({ id: 'existing' });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('normaliza codigo QR al crear y al resolver por codigo', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      empresaId: user.empresaId,
    });
    identificadoresRepositoryMock.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'qr-1',
        empresaId: user.empresaId,
        codigoQr: 'QR-ACTIVO-001',
        estaActivo: true,
      });
    identificadoresRepositoryMock.create.mockImplementation((value) => value);
    identificadoresRepositoryMock.save.mockImplementation(async (value) => ({ id: 'qr-1', ...value }));
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.create(
      {
        activoId: '33333333-3333-3333-3333-333333333333',
        codigoQr: ' qr-activo-001 ',
      },
      user,
    );

    expect(identificadoresRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigoQr: 'QR-ACTIVO-001' }),
    );

    const resolved = await service.findByCodigoQr(' qr-activo-001 ', user);
    expect(resolved.codigoQr).toBe('QR-ACTIVO-001');
  });

  it('rechaza leer un QR de otro tenant', async () => {
    identificadoresRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('qr-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrado');
    expect(identificadoresRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'qr-tenant-b', empresaId: 'tenant-a' },
    });
  });
});
