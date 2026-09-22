import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriasEquipoService } from './categorias-equipo.service';
import { CategoriaEquipo } from './entities/categoria-equipo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';

describe('CategoriasEquipoService', () => {
  let service: CategoriasEquipoService;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };

  const tiposRepositoryMock = {
    count: jest.fn(),
  };

  const dominiosRepositoryMock = {
    findOne: jest.fn(),
  };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriasEquipoService,
        {
          provide: getRepositoryToken(CategoriaEquipo),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(TiposActivo),
          useValue: tiposRepositoryMock,
        },
        {
          provide: getRepositoryToken(DominioCatalogoActivo),
          useValue: dominiosRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<CategoriasEquipoService>(CategoriasEquipoService);
    jest.resetAllMocks();
  });

  it('crea categoria validando dominio y unicidad de codigo', async () => {
    dominiosRepositoryMock.findOne.mockResolvedValue({
      id: 'dom-1',
      empresaId: user.empresaId,
      estaActivo: true,
    });
    repositoryMock.findOne.mockResolvedValue(null);
    repositoryMock.create.mockReturnValue({ id: 'cat-1' });
    repositoryMock.save.mockResolvedValue({ id: 'cat-1' });

    const result = await service.create(
      {
        dominioId: 'dom-1',
        codigo: '  laptops  ',
        nombre: '  Laptops  ',
      },
      user,
    );

    expect(result).toMatchObject({ id: 'cat-1' });
    expect(repositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        codigo: 'laptops',
        nombre: 'Laptops',
        estaActiva: true,
      }),
    );
  });

  it('rechaza create cuando dominio no pertenece al tenant', async () => {
    dominiosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        { dominioId: 'dom-tenant-b', codigo: 'laptops', nombre: 'Laptops' },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza create con codigo duplicado en el tenant', async () => {
    dominiosRepositoryMock.findOne.mockResolvedValue({
      id: 'dom-1',
      empresaId: user.empresaId,
      estaActivo: true,
    });
    repositoryMock.findOne.mockResolvedValue({ id: 'cat-existente' });

    await expect(
      service.create(
        { dominioId: 'dom-1', codigo: 'laptops', nombre: 'Laptops' },
        user,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rechaza update cuando la categoria no es del tenant', async () => {
    repositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.update(
        'cat-tenant-b',
        { dominioId: 'dom-1', codigo: 'laptops', nombre: 'Laptops' },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('desactiva categoria en remove y evita borrado fisico', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    tiposRepositoryMock.count.mockResolvedValue(0);
    repositoryMock.save.mockResolvedValue({ id: 'cat-1', estaActiva: false });

    const result = await service.remove('cat-1', user);

    expect(result).toEqual({ ok: true });
    expect(repositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cat-1',
        estaActiva: false,
      }),
    );
  });

  it('rechaza remove cuando tiene tipos asociados', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'cat-1',
      empresaId: user.empresaId,
      estaActiva: true,
    });
    tiposRepositoryMock.count.mockResolvedValue(2);

    await expect(service.remove('cat-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
