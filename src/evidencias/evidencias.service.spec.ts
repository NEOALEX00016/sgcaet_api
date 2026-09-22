import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { EvidenciasService } from './evidencias.service';
import { Evidencia } from './entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('EvidenciasService', () => {
  let service: EvidenciasService;
  const evidenciasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const configServiceMock = {
    get: jest.fn().mockReturnValue('storage/evidencias-test'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvidenciasService,
        {
          provide: getRepositoryToken(Evidencia),
          useValue: evidenciasRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<EvidenciasService>(EvidenciasService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
