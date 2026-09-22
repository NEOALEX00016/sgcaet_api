import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException } from '@nestjs/common';
import { ConfiguracionSolicitudesService } from './configuracion-solicitudes.service';
import { ConfiguracionSolicitudes } from './entities/configuracion-solicitudes.entity';
import { IntegracionMesaAyuda } from '../integraciones-mesa-ayuda/entities/integracion-mesa-ayuda.entity';

describe('ConfiguracionSolicitudesService', () => {
  let service: ConfiguracionSolicitudesService;

  const repo = {
    findOne: jest.fn(),
    save: jest.fn(async (value) => value),
    merge: jest.fn((a, b) => ({ ...a, ...b })),
    create: jest.fn((value) => value),
  };

  const integracionesRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfiguracionSolicitudesService,
        { provide: getRepositoryToken(ConfiguracionSolicitudes), useValue: repo },
        { provide: getRepositoryToken(IntegracionMesaAyuda), useValue: integracionesRepo },
      ],
    }).compile();

    service = module.get<ConfiguracionSolicitudesService>(ConfiguracionSolicitudesService);
    jest.clearAllMocks();
  });

  it('rechaza mesa_ayuda como responsable sin integración activa', async () => {
    integracionesRepo.findOne.mockResolvedValue(null);
    await expect(
      service.update('e-1', { responsableEquipo: 'mesa_ayuda' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite mesa_ayuda como responsable cuando existe integración activa', async () => {
    integracionesRepo.findOne.mockResolvedValue({ id: 'i-1', empresaId: 'e-1', activo: true });
    repo.findOne.mockResolvedValue(null);

    const result = await service.update('e-1', { responsableEquipo: 'mesa_ayuda' });

    expect(result.responsableEquipo).toBe('mesa_ayuda');
    expect(repo.save).toHaveBeenCalled();
  });
});
