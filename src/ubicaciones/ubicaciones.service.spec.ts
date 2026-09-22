import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UbicacionesService } from './ubicaciones.service';
import { Ubicacione } from './entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('UbicacionesService', () => {
  let service: UbicacionesService;
  const ubicacionesRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UbicacionesService,
        {
          provide: getRepositoryToken(Ubicacione),
          useValue: ubicacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
      ],
    }).compile();

    service = module.get<UbicacionesService>(UbicacionesService);
    jest.clearAllMocks();
  });

  it('debe crear ubicacion y registrar bitacora', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      codigo: 'UBI-01',
      nombre: 'Almacen central',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    const created = { id: 'ubi-1', ...dto, estaActiva: true };
    ubicacionesRepositoryMock.create.mockReturnValue(created);
    ubicacionesRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'ubi-1', codigo: 'UBI-01' });
    expect(ubicacionesRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        estaActiva: true,
      }),
    );
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza leer una ubicacion de otro tenant', async () => {
    ubicacionesRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('ubi-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrada');
    expect(ubicacionesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: { id: 'ubi-tenant-b', empresaId: 'tenant-a' },
    });
  });

  it('desactiva la ubicacion en remove (sin borrado fisico)', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const ubicacion = {
      id: 'ubi-1',
      empresaId: user.empresaId,
      estaActiva: true,
    };

    ubicacionesRepositoryMock.findOne.mockResolvedValue(ubicacion);
    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    ubicacionesRepositoryMock.save.mockResolvedValue({
      ...ubicacion,
      estaActiva: false,
    });
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.remove('ubi-1', user);

    expect(ubicacionesRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'ubi-1',
        estaActiva: false,
      }),
    );
  });
});
