import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BitacoraAuditoriaSistemaService } from './bitacora-auditoria-sistema.service';
import { BitacoraAuditoriaSistema } from './entities/bitacora-auditoria-sistema.entity';
import { NotFoundException } from '@nestjs/common';

describe('BitacoraAuditoriaSistemaService', () => {
  let service: BitacoraAuditoriaSistemaService;
  const queryBuilderMock = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };

  const repositoryMock = {
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilderMock),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BitacoraAuditoriaSistemaService,
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<BitacoraAuditoriaSistemaService>(
      BitacoraAuditoriaSistemaService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll devuelve datos paginados', async () => {
    queryBuilderMock.getManyAndCount.mockResolvedValue([[{ id: '1' }], 1]);

    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    };
    const result = await service.findAll(
      { pagina: 1, limite: 10, accion: 'ROLES_CREAR' },
      user,
    );

    expect(repositoryMock.createQueryBuilder).toHaveBeenCalledWith('bitacora');
    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'bitacora.accion = :accion',
      { accion: 'ROLES_CREAR' },
    );
    expect(result).toEqual({
      items: [{ id: '1' }],
      total: 1,
      pagina: 1,
      limite: 10,
      totalPaginas: 1,
    });
  });

  it('findAll permite tenant objetivo explicito en consulta global', async () => {
    queryBuilderMock.getManyAndCount.mockResolvedValue([[{ id: '2' }], 1]);

    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: 'tenant-actor',
      correo: 'admin@empresa.com',
    };

    await service.findAll({ pagina: 1, limite: 20 }, user, 'tenant-objetivo');

    expect(queryBuilderMock.andWhere).toHaveBeenCalledWith(
      'bitacora.empresa_id = :empresaId',
      { empresaId: 'tenant-objetivo' },
    );
  });

  it('findOne lanza NotFoundException cuando no existe', async () => {
    repositoryMock.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('no-existe', {
        userId: '22222222-2222-2222-2222-222222222222',
        empresaId: '11111111-1111-1111-1111-111111111111',
        correo: 'admin@empresa.com',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
