import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AuditoriaDetallesService } from './auditoria-detalles.service';
import { AuditoriaDetalle } from './entities/auditoria-detalle.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

describe('AuditoriaDetallesService', () => {
  let service: AuditoriaDetallesService;
  const detallesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const auditoriasRepositoryMock = { findOne: jest.fn() };
  const activosRepositoryMock = { findOne: jest.fn() };
  const personasRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const tiposActivosRepositoryMock = { find: jest.fn() };
  const categoriasRepositoryMock = { find: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditoriaDetallesService,
        {
          provide: getRepositoryToken(AuditoriaDetalle),
          useValue: detallesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Auditoria),
          useValue: auditoriasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Persona),
          useValue: personasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: getRepositoryToken(TiposActivo), useValue: tiposActivosRepositoryMock },
        { provide: getRepositoryToken(CategoriaEquipo), useValue: categoriasRepositoryMock },
      ],
    }).compile();

    service = module.get<AuditoriaDetallesService>(AuditoriaDetallesService);
    jest.clearAllMocks();
  });

  it('rechaza detalle duplicado por auditoria y activo', async () => {
    const dto = {
      auditoriaId: '33333333-3333-3333-3333-333333333333',
      activoId: '44444444-4444-4444-4444-444444444444',
      resultado: 'localizado',
    };
    auditoriasRepositoryMock.findOne.mockResolvedValue({ id: dto.auditoriaId });
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId });
    detallesRepositoryMock.findOne.mockResolvedValue({ id: 'dup' });

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
