import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DominiosCatalogoActivosService } from './dominios-catalogo-activos.service';
import { DominioCatalogoActivo } from './entities/dominio-catalogo-activo.entity';

describe('DominiosCatalogoActivosService', () => {
  let service: DominiosCatalogoActivosService;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DominiosCatalogoActivosService,
        {
          provide: getRepositoryToken(DominioCatalogoActivo),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<DominiosCatalogoActivosService>(
      DominiosCatalogoActivosService,
    );

    jest.resetAllMocks();
  });

  it('crea dominio tenant-scoped con estado activo', async () => {
    const dto = {
      codigo: 'equipos-ti',
      nombre: 'Equipos TI',
      manejaLineas: false,
    };

    repositoryMock.create.mockReturnValue({ id: 'dom-1', ...dto });
    repositoryMock.save.mockResolvedValue({ id: 'dom-1', ...dto });

    const result = await service.create(dto, user);

    expect(result).toMatchObject({ id: 'dom-1', codigo: 'equipos-ti' });
    expect(repositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        esBase: false,
        estaActivo: true,
      }),
    );
  });

  it('lista dominios solo del tenant autenticado', async () => {
    repositoryMock.find.mockResolvedValue([{ id: 'dom-1' }]);

    const result = await service.findAll(user);

    expect(result).toHaveLength(1);
    expect(repositoryMock.find).toHaveBeenCalledWith({
      where: { empresaId: user.empresaId },
      order: { nombre: 'ASC' },
    });
  });

  it('rechaza update cuando dominio no pertenece al tenant', async () => {
    repositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.update('dom-tenant-b', { codigo: 'nuevo', nombre: 'Nuevo' }, user),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rechaza cambio de codigo en dominio base', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'dom-base',
      empresaId: user.empresaId,
      codigo: 'telecom',
      nombre: 'Telecom',
      esBase: true,
      estaActivo: true,
    });

    await expect(
      service.update(
        'dom-base',
        { codigo: 'telecom-nuevo', nombre: 'Telecom' },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('desactiva dominio no base en remove', async () => {
    const item = {
      id: 'dom-1',
      empresaId: user.empresaId,
      esBase: false,
      estaActivo: true,
    };
    repositoryMock.findOne.mockResolvedValue(item);
    repositoryMock.save.mockResolvedValue({ ...item, estaActivo: false });

    const result = await service.remove('dom-1', user);

    expect(result).toMatchObject({ estaActivo: false });
    expect(repositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'dom-1',
        estaActivo: false,
      }),
    );
  });

  it('rechaza remove en dominio base', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'dom-base',
      empresaId: user.empresaId,
      esBase: true,
      codigo: 'equipos',
    });

    await expect(service.remove('dom-base', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('valida capacidad telecom habilitada', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'dom-telecom',
      empresaId: user.empresaId,
      codigo: 'telecom',
      estaActivo: true,
      manejaLineas: true,
    });

    await expect(
      service.assertTelecomCapability(user.empresaId, 'manejaLineas'),
    ).resolves.toBeUndefined();
  });

  it('rechaza capacidad telecom no habilitada', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'dom-telecom',
      empresaId: user.empresaId,
      codigo: 'telecom',
      estaActivo: true,
      manejaLineas: false,
    });

    await expect(
      service.assertTelecomCapability(user.empresaId, 'manejaLineas'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
