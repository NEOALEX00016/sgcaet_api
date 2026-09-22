import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EstructuraOrganizacionalNodosService } from './estructura-organizacional-nodos.service';
import { EstructuraOrganizacionalNodo } from './entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('EstructuraOrganizacionalNodosService', () => {
  let service: EstructuraOrganizacionalNodosService;

  const repoMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosMock = { findOne: jest.fn() };
  const bitacoraMock = { create: jest.fn(), save: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstructuraOrganizacionalNodosService,
        {
          provide: getRepositoryToken(EstructuraOrganizacionalNodo),
          useValue: repoMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraMock,
        },
      ],
    }).compile();

    service = module.get<EstructuraOrganizacionalNodosService>(
      EstructuraOrganizacionalNodosService,
    );
    jest.resetAllMocks();
  });

  it('crea nodo cuando el padre existe en el mismo tenant', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    repoMock.findOne.mockResolvedValueOnce({
      id: 'padre-a',
      empresaId: user.empresaId,
      nodoPadreId: null,
    });
    repoMock.create.mockReturnValue({ id: 'nodo-1' });
    repoMock.save.mockResolvedValue({ id: 'nodo-1' });
    bitacoraMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(
      {
        nodoPadreId: 'padre-a',
        tipoNodo: 'gerencia',
        codigo: 'GER',
        nombre: 'Gerencia',
      },
      user,
    );

    expect(result).toMatchObject({ id: 'nodo-1' });
  });

  it('rechaza create cuando el padre es de otro tenant', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    repoMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          nodoPadreId: 'padre-tenant-b',
          tipoNodo: 'gerencia',
          codigo: 'GER',
          nombre: 'Gerencia',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza update cuando genera ciclo jerarquico', async () => {
    repoMock.findOne
      .mockResolvedValueOnce({
        id: 'nodo-a',
        empresaId: user.empresaId,
        nodoPadreId: null,
      })
      .mockResolvedValueOnce({
        id: 'nodo-b',
        empresaId: user.empresaId,
        nodoPadreId: 'nodo-a',
      });
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });

    await expect(
      service.update(
        'nodo-a',
        {
          nodoPadreId: 'nodo-b',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
