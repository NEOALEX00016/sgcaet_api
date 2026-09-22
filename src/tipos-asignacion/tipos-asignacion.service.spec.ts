import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TiposAsignacionService } from './tipos-asignacion.service';
import { TipoAsignacion } from './entities/tipos-asignacion.entity';

describe('TiposAsignacionService', () => {
  let service: TiposAsignacionService;

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
        TiposAsignacionService,
        {
          provide: getRepositoryToken(TipoAsignacion),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<TiposAsignacionService>(TiposAsignacionService);
    jest.resetAllMocks();
  });

  it('crea tipo de asignacion tenant-scoped con defaults', async () => {
    const dto = {
      codigo: 'entrega_inicial',
      nombre: 'Entrega inicial',
      requiereFormulario: true,
    };
    repositoryMock.findOne.mockResolvedValue(null);
    repositoryMock.create.mockImplementation((value) => value);
    repositoryMock.save.mockImplementation(async (value) => value);

    const result = await service.create(dto, user);

    expect(result).toMatchObject({
      empresaId: user.empresaId,
      codigo: 'entrega_inicial',
      requiereFormulario: true,
      estaActivo: true,
    });
  });

  it('rechaza codigo duplicado por tenant', async () => {
    repositoryMock.findOne.mockResolvedValue({
      id: 'tipo-1',
      empresaId: user.empresaId,
      codigo: 'entrega_inicial',
    });

    await expect(
      service.create(
        { codigo: 'entrega_inicial', nombre: 'Entrega inicial' },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza findOne fuera de tenant', async () => {
    repositoryMock.findOne.mockResolvedValue(null);

    await expect(service.findOne('tipo-x', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
