import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EspecificacionesTipoActivoService } from './especificaciones-tipo-activo.service';
import { EspecificacionTipoActivo } from './entities/especificacion-tipo-activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

describe('EspecificacionesTipoActivoService', () => {
  let service: EspecificacionesTipoActivoService;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
  };

  const tiposRepositoryMock = { findOne: jest.fn() };
  const categoriasRepositoryMock = { findOne: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EspecificacionesTipoActivoService,
        {
          provide: getRepositoryToken(EspecificacionTipoActivo),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(TiposActivo),
          useValue: tiposRepositoryMock,
        },
        {
          provide: getRepositoryToken(CategoriaEquipo),
          useValue: categoriasRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<EspecificacionesTipoActivoService>(
      EspecificacionesTipoActivoService,
    );
    jest.resetAllMocks();
  });

  it('crea especificacion de categoria con clave unica y tipo valido', async () => {
    categoriasRepositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    repositoryMock.findOne.mockResolvedValue(null);
    repositoryMock.create.mockReturnValue({ id: 'esp-1' });
    repositoryMock.save.mockResolvedValue({ id: 'esp-1' });

    const result = await service.create(
      {
        categoriaEquipoId: 'cat-1',
        nombre: 'RAM',
        tipoDato: 'texto',
      },
      user,
    );

    expect(result).toMatchObject({ id: 'esp-1' });
    expect(repositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        clave: 'ram',
      }),
    );
  });

  it('rechaza crear si categoria no pertenece al tenant', async () => {
    categoriasRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          categoriaEquipoId: 'cat-tenant-b',
          nombre: 'RAM',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza crear si tipoDato no es valido', async () => {
    categoriasRepositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });

    await expect(
      service.create(
        {
          categoriaEquipoId: 'cat-1',
          nombre: 'RAM',
          tipoDato: 'moneda' as never,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza crear clave duplicada en mismo alcance', async () => {
    categoriasRepositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    repositoryMock.findOne.mockResolvedValue({ id: 'esp-existente' });

    await expect(
      service.create(
        {
          categoriaEquipoId: 'cat-1',
          nombre: 'RAM',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('crea especificacion de tipo con dependencia valida a clave general de categoria', async () => {
    tiposRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: 'cat-1',
        estaActivo: true,
      })
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: 'cat-1',
        estaActivo: true,
      });
    repositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'esp-general-ram',
        empresaId: user.empresaId,
        categoriaEquipoId: 'cat-1',
        clave: 'ram',
      })
      .mockResolvedValueOnce(null);
    repositoryMock.create.mockReturnValue({ id: 'esp-tipo-1' });
    repositoryMock.save.mockResolvedValue({ id: 'esp-tipo-1' });

    const result = await service.create(
      {
        tipoActivoId: 'tipo-1',
        nombre: 'RAM recomendada',
        dependeDeClave: 'ram',
      },
      user,
    );

    expect(result).toMatchObject({ id: 'esp-tipo-1' });
    expect(repositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoActivoId: 'tipo-1',
        dependeDeClave: 'ram',
      }),
    );
  });

  it('rechaza especificacion de tipo cuando dependencia no existe en categoria', async () => {
    tiposRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: 'cat-1',
        estaActivo: true,
      })
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: 'cat-1',
        estaActivo: true,
      });
    repositoryMock.findOne.mockResolvedValueOnce(null);

    await expect(
      service.create(
        {
          tipoActivoId: 'tipo-1',
          nombre: 'RAM recomendada',
          dependeDeClave: 'ram_inexistente',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza especificacion de tipo cuando el tipo no tiene categoria para validar dependencia', async () => {
    tiposRepositoryMock.findOne
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: null,
        estaActivo: true,
      })
      .mockResolvedValueOnce({
        id: 'tipo-1',
        empresaId: user.empresaId,
        categoriaEquipoId: null,
        estaActivo: true,
      });

    await expect(
      service.create(
        {
          tipoActivoId: 'tipo-1',
          nombre: 'RAM recomendada',
          dependeDeClave: 'ram',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
