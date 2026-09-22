import { Test, TestingModule } from '@nestjs/testing';
import { LicenciasEmpresaController } from './licencias-empresa.controller';
import { LicenciasEmpresaService } from './licencias-empresa.service';
import { CreateLicenciasEmpresaDto } from './dto/create-licencias-empresa.dto';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

describe('LicenciasEmpresaController', () => {
  let controller: LicenciasEmpresaController;
  const serviceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    evaluarModoSoloLectura: jest.fn(),
  };
  const targetTenantContextServiceMock = {
    resolveTargetEmpresaId: jest
      .fn()
      .mockResolvedValue('11111111-1111-4111-8111-111111111111'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LicenciasEmpresaController],
      providers: [
        {
          provide: LicenciasEmpresaService,
          useValue: serviceMock,
        },
        {
          provide: TargetTenantContextService,
          useValue: targetTenantContextServiceMock,
        },
      ],
    }).compile();

    controller = module.get<LicenciasEmpresaController>(
      LicenciasEmpresaController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateLicenciasEmpresaDto = {
      tipoLicencia: 'anual',
      iniciaEn: '2026-01-01T00:00:00.000Z',
      venceEn: '2027-01-01T00:00:00.000Z',
    };

    serviceMock.create.mockResolvedValue({ id: 'lic-1', ...dto });

    const user = {
      userId: '22222222-2222-4222-8222-222222222222',
      empresaId: '11111111-1111-4111-8111-111111111111',
      correo: 'actor@test.local',
    };
    const result = await controller.create(dto, user);

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      undefined,
    );
    expect(serviceMock.create).toHaveBeenCalledWith(
      dto,
      user,
      '11111111-1111-4111-8111-111111111111',
    );
    expect(result).toMatchObject({ id: 'lic-1', tipoLicencia: 'anual' });
  });
});
