import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { Incidencia } from './entities/incidencia.entity';
import { AuditoriaDetalle } from '../auditoria-detalles/entities/auditoria-detalle.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('IncidenciasService', () => {
  let service: IncidenciasService;
  const incidenciasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const auditoriaDetallesRepositoryMock = { findOne: jest.fn() };
  const activosRepositoryMock = { findOne: jest.fn() };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidenciasService,
        {
          provide: getRepositoryToken(Incidencia),
          useValue: incidenciasRepositoryMock,
        },
        {
          provide: getRepositoryToken(AuditoriaDetalle),
          useValue: auditoriaDetallesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
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

    service = module.get<IncidenciasService>(IncidenciasService);
    jest.clearAllMocks();
  });

  it('rechaza incidencia cerrada sin fecha de cierre', async () => {
    const dto = {
      codigo: 'INC-001',
      titulo: 'Linea sin servicio',
      estado: 'cerrada',
    };
    incidenciasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(dto as never, {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'actor@test.local',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lista incidencias propias del usuario autenticado', async () => {
    incidenciasRepositoryMock.find.mockResolvedValue([
      {
        id: 'inc-1',
        empresaId: '11111111-1111-1111-1111-111111111111',
        reportadaPor: '22222222-2222-2222-2222-222222222222',
      },
    ]);

    const result = await service.findMine(
      {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'actor@test.local',
      },
      'abierta',
      'alta',
    );

    expect(result).toHaveLength(1);
    expect(incidenciasRepositoryMock.find).toHaveBeenCalledWith({
      where: {
        empresaId: '11111111-1111-1111-1111-111111111111',
        reportadaPor: '22222222-2222-2222-2222-222222222222',
        estado: 'abierta',
        prioridad: 'alta',
      },
      order: { createdAt: 'DESC' },
    });
  });

  it('lista incidencias administrativas por tenant y filtros', async () => {
    incidenciasRepositoryMock.find.mockResolvedValue([
      { id: 'inc-admin-1', empresaId: '11111111-1111-1111-1111-111111111111' },
    ]);

    const result = await service.findAll(
      '11111111-1111-1111-1111-111111111111',
      'en_investigacion',
      'media',
      '33333333-3333-3333-3333-333333333333',
    );

    expect(result).toHaveLength(1);
    expect(incidenciasRepositoryMock.find).toHaveBeenCalledWith({
      where: {
        empresaId: '11111111-1111-1111-1111-111111111111',
        estado: 'en_investigacion',
        prioridad: 'media',
        asignadaA: '33333333-3333-3333-3333-333333333333',
      },
      order: { createdAt: 'DESC' },
    });
  });
});
