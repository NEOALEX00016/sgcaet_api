import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasEmpresaService } from './licencias-empresa.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LicenciaEmpresa } from './entities/licencias-empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { LicenciaFirmaService } from './licencia-firma.service';

describe('LicenciasEmpresaService', () => {
  let service: LicenciasEmpresaService;
  const licenciasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const licenciaFirmaServiceMock = {
    enforcementEnabled: jest.fn().mockReturnValue(false),
    validar: jest.fn().mockReturnValue(true),
    crearPayload: jest.fn(),
    firmar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LicenciasEmpresaService,
        {
          provide: getRepositoryToken(LicenciaEmpresa),
          useValue: licenciasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: LicenciaFirmaService, useValue: licenciaFirmaServiceMock },
      ],
    }).compile();

    service = module.get<LicenciasEmpresaService>(LicenciasEmpresaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear licencia y registrar bitacora', async () => {
    const dto = {
      tipoLicencia: 'anual',
      iniciaEn: '2026-01-01T00:00:00.000Z',
      venceEn: '2027-01-01T00:00:00.000Z',
    };

    const created = {
      id: 'lic-1',
      empresaId: '11111111-1111-4111-8111-111111111111',
      tipoLicencia: dto.tipoLicencia,
      estado: 'activa',
      iniciaEn: new Date(dto.iniciaEn),
      venceEn: new Date(dto.venceEn),
      modoSoloLecturaAlVencer: true,
    };
    licenciasRepositoryMock.create.mockReturnValue(created);
    licenciasRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(
      dto,
      {
        userId: '22222222-2222-4222-8222-222222222222',
        empresaId: '99999999-9999-4999-8999-999999999999',
        correo: 'actor@test.local',
      },
      '11111111-1111-4111-8111-111111111111',
    );

    expect(licenciasRepositoryMock.create).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: 'lic-1', tipoLicencia: 'anual' });
  });

  it('debe devolver soloLectura true si licencia esta vencida', async () => {
    licenciasRepositoryMock.find.mockResolvedValue([
      {
        id: 'lic-2',
        empresaId: '11111111-1111-1111-1111-111111111111',
        tipoLicencia: 'anual',
        estado: 'vencida',
        iniciaEn: new Date('2025-01-01T00:00:00.000Z'),
        venceEn: new Date('2025-02-01T00:00:00.000Z'),
        modoSoloLecturaAlVencer: true,
      },
    ]);

    const result = await service.evaluarModoSoloLectura(
      '11111111-1111-1111-1111-111111111111',
    );

    expect(result).toEqual({ soloLectura: true, razon: 'Sin licencia activa' });
  });
});
