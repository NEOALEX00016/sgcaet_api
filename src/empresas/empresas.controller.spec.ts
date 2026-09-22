import { Test, TestingModule } from '@nestjs/testing';
import { EmpresasController } from './empresas.controller';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

describe('EmpresasController', () => {
  let controller: EmpresasController;
  const empresasServiceMock = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const targetTenantContextServiceMock = {
    resolveTargetEmpresaId: jest.fn().mockResolvedValue('empresa-actor'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmpresasController],
      providers: [
        {
          provide: EmpresasService,
          useValue: empresasServiceMock,
        },
        {
          provide: TargetTenantContextService,
          useValue: targetTenantContextServiceMock,
        },
      ],
    }).compile();

    controller = module.get<EmpresasController>(EmpresasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('debe delegar create al servicio', async () => {
    const dto: CreateEmpresaDto = {
      codigo: 'EMP-001',
      nombreLegal: 'Empresa Uno SRL',
      codigoPais: 'DO',
      tipoIdentificacionFiscal: 'RNC',
      numeroIdentificacionFiscal: '101010101',
    };

    empresasServiceMock.create.mockResolvedValue({ id: '1', ...dto });

    const user = {
      userId: 'owner-1',
      empresaId: 'empresa-actor',
      correo: 'owner@test.local',
    };

    const result = await controller.create(dto, user);

    expect(targetTenantContextServiceMock.resolveTargetEmpresaId).toHaveBeenCalledWith(
      user,
      undefined,
      'PLATAFORMA_TENANT_GLOBAL_VALIDAR',
    );
    expect(empresasServiceMock.create).toHaveBeenCalledWith(dto, user);
    expect(result).toMatchObject({ id: '1', codigo: 'EMP-001' });
  });
});
