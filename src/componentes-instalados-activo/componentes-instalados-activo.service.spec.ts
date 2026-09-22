import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ComponentesInstaladosActivoService } from './componentes-instalados-activo.service';
import { ComponenteInstaladoActivo } from './entities/componente-instalado-activo.entity';
import { Activo } from '../activos/entities/activo.entity';

describe('ComponentesInstaladosActivoService', () => {
  const user = { userId: 'user-1', empresaId: 'tenant-1', correo: 'test@example.com' };
  const componentes = { find: jest.fn() };
  const activos = { findOne: jest.fn() };
  let service: ComponentesInstaladosActivoService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ComponentesInstaladosActivoService,
        { provide: getRepositoryToken(ComponenteInstaladoActivo), useValue: componentes },
        { provide: getRepositoryToken(Activo), useValue: activos },
      ],
    }).compile();
    service = module.get(ComponentesInstaladosActivoService);
    jest.clearAllMocks();
  });

  it('debe exigir activoId', async () => {
    await expect(service.findByActivo('', false, user)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('debe rechazar activos de otro tenant', async () => {
    activos.findOne.mockResolvedValue(null);
    await expect(service.findByActivo('asset-1', false, user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('debe filtrar instalados o devolver historial completo', async () => {
    activos.findOne.mockResolvedValue({ id: 'asset-1' });
    componentes.find.mockResolvedValue([]);

    await service.findByActivo('asset-1', false, user);
    expect(componentes.find).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { empresaId: user.empresaId, activoId: 'asset-1', estado: 'instalado' },
    }));

    await service.findByActivo('asset-1', true, user);
    expect(componentes.find).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { empresaId: user.empresaId, activoId: 'asset-1' },
    }));
  });
});
