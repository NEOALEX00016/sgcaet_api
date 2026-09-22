import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { NotFoundException } from '@nestjs/common';
import { AuditoriasService } from './auditorias.service';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('AuditoriasService', () => {
  let service: AuditoriasService;
  const auditoriasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriasService,
        {
          provide: getRepositoryToken(Auditoria),
          useValue: auditoriasRepositoryMock,
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

    service = module.get<AuditoriasService>(AuditoriasService);
    jest.clearAllMocks();
  });

  it('rechaza fecha de cierre anterior a inicio', async () => {
    const dto = {
      codigo: 'AUD-001',
      tipoAuditoria: 'programada',
      fechaInicio: '2026-09-09T00:00:00.000Z',
      fechaCierre: '2026-09-08T00:00:00.000Z',
    };
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: dto.usuarioActorId,
    });

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza acceder a una auditoria de otro tenant', async () => {
    auditoriasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('auditoria-tenant-b', {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(auditoriasRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'auditoria-tenant-b',
        empresaId: '11111111-1111-1111-1111-111111111111',
      },
    });
  });
});
