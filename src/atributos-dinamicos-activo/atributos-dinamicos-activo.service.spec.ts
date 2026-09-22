import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { AtributosDinamicosActivoService } from './atributos-dinamicos-activo.service';
import { AtributosDinamicosActivo } from './entities/atributos-dinamicos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('AtributosDinamicosActivoService', () => {
  let service: AtributosDinamicosActivoService;
  const atributosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };
  const activosRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AtributosDinamicosActivoService,
        {
          provide: getRepositoryToken(AtributosDinamicosActivo),
          useValue: atributosRepositoryMock,
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

    service = module.get<AtributosDinamicosActivoService>(
      AtributosDinamicosActivoService,
    );
    jest.clearAllMocks();
  });

  it('rechaza mas de un tipo de valor en atributo', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      activoId: '33333333-3333-3333-3333-333333333333',
      clave: 'ramGb',
      valorTexto: '16',
      valorNumero: 16,
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoId,
      empresaId: user.empresaId,
    });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza leer un atributo de otro tenant', async () => {
    atributosRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('attr-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrado');
    expect(atributosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'attr-tenant-b', empresaId: 'tenant-a' },
    });
  });
});
