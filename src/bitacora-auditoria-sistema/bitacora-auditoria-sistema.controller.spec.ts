import { Test, TestingModule } from '@nestjs/testing';
import { BitacoraAuditoriaSistemaController } from './bitacora-auditoria-sistema.controller';
import { BitacoraAuditoriaSistemaService } from './bitacora-auditoria-sistema.service';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

describe('BitacoraAuditoriaSistemaController', () => {
  let controller: BitacoraAuditoriaSistemaController;
  const serviceMock = {
    findAll: jest.fn(),
    findOne: jest.fn(),
  };
  const targetTenantContextServiceMock = {
    resolveTargetEmpresaId: jest.fn().mockResolvedValue('tenant-objetivo'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BitacoraAuditoriaSistemaController],
      providers: [
        {
          provide: BitacoraAuditoriaSistemaService,
          useValue: serviceMock,
        },
        {
          provide: TargetTenantContextService,
          useValue: targetTenantContextServiceMock,
        },
      ],
    }).compile();

    controller = module.get<BitacoraAuditoriaSistemaController>(
      BitacoraAuditoriaSistemaController,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delega query al servicio', async () => {
    serviceMock.findAll.mockResolvedValue({
      items: [],
      total: 0,
      pagina: 1,
      limite: 20,
      totalPaginas: 1,
    });
    const query = { pagina: 1, limite: 20 };
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    };

    const result = await controller.findAll(query, user, 'tenant-objetivo');

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      'tenant-objetivo',
      'PLATAFORMA_AUDITORIA_GLOBAL_CONSULTAR',
    );
    expect(serviceMock.findAll).toHaveBeenCalledWith(
      query,
      user,
      'tenant-objetivo',
    );
    expect(result.total).toBe(0);
  });

  it('findOne delega id al servicio', async () => {
    serviceMock.findOne.mockResolvedValue({ id: '1' });

    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
      correo: 'admin@empresa.com',
    };
    const result = await controller.findOne('1', user, 'tenant-objetivo');

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      'tenant-objetivo',
      'PLATAFORMA_AUDITORIA_GLOBAL_CONSULTAR',
    );
    expect(serviceMock.findOne).toHaveBeenCalledWith('1', user, 'tenant-objetivo');
    expect(result.id).toBe('1');
  });
});
