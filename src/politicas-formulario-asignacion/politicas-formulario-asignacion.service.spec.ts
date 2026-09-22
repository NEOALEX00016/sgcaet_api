import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PoliticasFormularioAsignacionService } from './politicas-formulario-asignacion.service';
import { PoliticaFormularioAsignacion } from './entities/politicas-formulario-asignacion.entity';
import { TipoAsignacion } from '../tipos-asignacion/entities/tipos-asignacion.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';

describe('PoliticasFormularioAsignacionService', () => {
  let service: PoliticasFormularioAsignacionService;

  const policyRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const tipoRepo = { findOne: jest.fn() };
  const dominioRepo = { findOne: jest.fn() };
  const categoriaRepo = { findOne: jest.fn() };
  const formularioRepo = { findOne: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliticasFormularioAsignacionService,
        { provide: getRepositoryToken(PoliticaFormularioAsignacion), useValue: policyRepo },
        { provide: getRepositoryToken(TipoAsignacion), useValue: tipoRepo },
        { provide: getRepositoryToken(DominioCatalogoActivo), useValue: dominioRepo },
        { provide: getRepositoryToken(CategoriaEquipo), useValue: categoriaRepo },
        { provide: getRepositoryToken(Formulario), useValue: formularioRepo },
      ],
    }).compile();

    service = module.get<PoliticasFormularioAsignacionService>(
      PoliticasFormularioAsignacionService,
    );
    jest.resetAllMocks();
  });

  it('crea politica valida tenant-scoped', async () => {
    const dto = {
      tipoAsignacionId: 'tipo-1',
      dominioId: 'dom-1',
      formularioId: 'form-1',
    };
    tipoRepo.findOne.mockResolvedValue({ id: 'tipo-1', empresaId: user.empresaId, estaActivo: true });
    dominioRepo.findOne.mockResolvedValue({ id: 'dom-1', empresaId: user.empresaId, estaActivo: true });
    formularioRepo.findOne.mockResolvedValue({ id: 'form-1', empresaId: user.empresaId, estaActivo: true });
    policyRepo.find.mockResolvedValue([]);
    policyRepo.create.mockImplementation((v) => v);
    policyRepo.save.mockImplementation(async (v) => v);

    const saved = await service.create(dto, user);

    expect(saved).toMatchObject({ empresaId: user.empresaId, tipoAsignacionId: 'tipo-1' });
  });

  it('permite politica por categoria cuando la categoria no tiene dominio', async () => {
    const dto = {
      tipoAsignacionId: 'tipo-1',
      categoriaId: 'cat-1',
      formularioId: 'form-1',
    };
    tipoRepo.findOne.mockResolvedValue({ id: 'tipo-1', empresaId: user.empresaId, estaActivo: true });
    categoriaRepo.findOne.mockResolvedValue({ id: 'cat-1', empresaId: user.empresaId, dominioId: undefined, estaActiva: true });
    formularioRepo.findOne.mockResolvedValue({ id: 'form-1', empresaId: user.empresaId, estaActivo: true });
    policyRepo.find.mockResolvedValue([]);
    policyRepo.create.mockImplementation((v) => v);
    policyRepo.save.mockImplementation(async (v) => v);

    await expect(service.create(dto, user)).resolves.toMatchObject({ categoriaId: 'cat-1' });
  });

  it('rechaza politica duplicada por alcance', async () => {
    const dto = {
      tipoAsignacionId: 'tipo-1',
      dominioId: 'dom-1',
      formularioId: 'form-1',
    };
    tipoRepo.findOne.mockResolvedValue({ id: 'tipo-1', empresaId: user.empresaId, estaActivo: true });
    dominioRepo.findOne.mockResolvedValue({ id: 'dom-1', empresaId: user.empresaId, estaActivo: true });
    formularioRepo.findOne.mockResolvedValue({ id: 'form-1', empresaId: user.empresaId, estaActivo: true });
    policyRepo.find.mockResolvedValue([
      { id: 'p-1', empresaId: user.empresaId, tipoAsignacionId: 'tipo-1', dominioId: 'dom-1', categoriaId: null },
    ]);

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza findOne fuera de tenant', async () => {
    policyRepo.findOne.mockResolvedValue(null);
    await expect(service.findOne('x', user)).rejects.toBeInstanceOf(NotFoundException);
  });
});
