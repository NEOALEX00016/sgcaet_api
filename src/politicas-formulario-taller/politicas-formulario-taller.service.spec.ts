import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test } from '@nestjs/testing';
import { PoliticasFormularioTallerService } from './politicas-formulario-taller.service';
import { PoliticaFormularioTaller } from './entities/politicas-formulario-taller.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';

describe('PoliticasFormularioTallerService', () => {
  const repository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((value) => value),
    save: jest.fn((value) => value),
    merge: jest.fn((a, b) => ({ ...a, ...b })),
  };
  const categoryRepository = { findOne: jest.fn() };
  const typeRepository = { findOne: jest.fn() };
  const formRepository = { findOne: jest.fn() };
  let service: PoliticasFormularioTallerService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PoliticasFormularioTallerService,
        {
          provide: getRepositoryToken(PoliticaFormularioTaller),
          useValue: repository,
        },
        {
          provide: getRepositoryToken(CategoriaEquipo),
          useValue: categoryRepository,
        },
        { provide: getRepositoryToken(TiposActivo), useValue: typeRepository },
        { provide: getRepositoryToken(Formulario), useValue: formRepository },
      ],
    }).compile();
    service = module.get(PoliticasFormularioTallerService);
    jest.clearAllMocks();
  });

  it('resuelve tipo antes que categoria y general', async () => {
    repository.find.mockResolvedValue([
      { id: 'general' },
      { id: 'category', categoriaEquipoId: 'category-1' },
      { id: 'type', tipoActivoId: 'type-1' },
    ]);
    await expect(
      service.resolve(
        'tenant-1',
        'reparacion',
        'entrada',
        'type-1',
        'category-1',
      ),
    ).resolves.toMatchObject({ id: 'type' });
  });

  it('rechaza una politica con categoria y tipo simultaneos', async () => {
    await expect(
      service.create(
        {
          tipoServicio: 'reparacion',
          etapa: 'entrada',
          categoriaEquipoId: 'category-1',
          tipoActivoId: 'type-1',
          formularioId: 'form-1',
        },
        { empresaId: 'tenant-1', userId: 'user-1', correo: 'a@b.test' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
