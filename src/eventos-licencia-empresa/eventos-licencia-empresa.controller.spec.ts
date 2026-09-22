import { Test, TestingModule } from '@nestjs/testing';
import { EventosLicenciaEmpresaController } from './eventos-licencia-empresa.controller';
import { EventosLicenciaEmpresaService } from './eventos-licencia-empresa.service';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

describe('EventosLicenciaEmpresaController', () => {
  let controller: EventosLicenciaEmpresaController;

  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const targetTenantContextServiceMock = {
    resolveTargetEmpresaId: jest.fn().mockResolvedValue('tenant-objetivo'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventosLicenciaEmpresaController],
      providers: [
        {
          provide: EventosLicenciaEmpresaService,
          useValue: serviceMock,
        },
        {
          provide: TargetTenantContextService,
          useValue: targetTenantContextServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EventosLicenciaEmpresaController>(
      EventosLicenciaEmpresaController,
    );
  });

  it('resuelve tenant objetivo antes de crear evento', async () => {
    const user = {
      userId: 'actor',
      empresaId: 'tenant-actor',
      correo: 'actor@test.local',
    };
    const dto = { licenciaEmpresaId: 'licencia-1', tipoEvento: 'renovada' };
    serviceMock.create.mockResolvedValue({ id: 'evento-1', ...dto });

    await controller.create(dto, user, 'tenant-objetivo');

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      'tenant-objetivo',
      'PLATAFORMA_TENANT_GLOBAL_LICENCIAS_EVENTOS',
    );
    expect(serviceMock.create).toHaveBeenCalledWith(dto, user, 'tenant-objetivo');
  });

  it('resuelve tenant objetivo antes de listar eventos', async () => {
    const user = {
      userId: 'actor',
      empresaId: 'tenant-actor',
      correo: 'actor@test.local',
    };

    await controller.findAll(user, 'licencia-1', 'tenant-objetivo');

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      'tenant-objetivo',
      'PLATAFORMA_TENANT_GLOBAL_LICENCIAS_EVENTOS',
    );
    expect(serviceMock.findAll).toHaveBeenCalledWith('tenant-objetivo', 'licencia-1');
  });
});
