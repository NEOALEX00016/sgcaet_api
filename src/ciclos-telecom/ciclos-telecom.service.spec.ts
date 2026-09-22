import { CiclosTelecomService } from './ciclos-telecom.service';

describe('CiclosTelecomService', () => {
  const ciclos = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const pools = { findOne: jest.fn() };
  const capacidades = { find: jest.fn(), save: jest.fn() };
  const usuarios = { findOne: jest.fn() };
  const bitacora = { create: jest.fn(), save: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  const user = { userId: 'u-1', empresaId: 'e-1' } as any;
  let service: CiclosTelecomService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new CiclosTelecomService(ciclos as any, pools as any, capacidades as any, usuarios as any, bitacora as any, dataSource as any);
    usuarios.findOne.mockResolvedValue({ id: 'u-1' });
    pools.findOne.mockResolvedValue({ id: 'pool-1', diaRenovacion: 15 });
    ciclos.create.mockImplementation((value) => value);
    ciclos.save.mockImplementation(async (value) => ({ id: value.id ?? 'cycle-next', ...value }));
    bitacora.create.mockImplementation((value) => value);
    bitacora.save.mockResolvedValue(undefined);
  });

  it('crea un ciclo tenant-scoped y rechaza fechas invertidas', async () => {
    await expect(service.create({ poolTelecomId: 'pool-1', iniciaEn: '2026-01-10T00:00:00.000Z', terminaEn: '2026-01-01T00:00:00.000Z' }, user)).rejects.toThrow('terminar después');
    const result = await service.create({ poolTelecomId: 'pool-1', iniciaEn: '2026-01-01T00:00:00.000Z', terminaEn: '2026-02-01T00:00:00.000Z' }, user);
    expect(result).toMatchObject({ empresaId: 'e-1', estado: 'abierto' });
  });

  it('cierra, aplica rollover y abre el siguiente ciclo en el día configurado', async () => {
    const cycle = { id: 'cycle-1', empresaId: 'e-1', poolTelecomId: 'pool-1', iniciaEn: new Date('2026-01-01T00:00:00.000Z'), terminaEn: new Date('2026-01-31T00:00:00.000Z'), estado: 'abierto' } as any;
    const manager = {
      getRepository: jest.fn((entity) => {
        if (entity.name === 'CicloTelecom') return ciclos;
        if (entity.name === 'CapacidadPoolTelecom') return capacidades;
        if (entity.name === 'PoolTelecom') return pools;
        return bitacora;
      }),
    };
    dataSource.transaction.mockImplementation((callback) => callback(manager));
    ciclos.findOne.mockResolvedValue(cycle);
    capacidades.find.mockResolvedValue([{ tipoCapacidad: 'minutos', cantidadContratada: '100', cantidadRolloverActual: '0', cantidadAsignada: '0', cantidadConsumida: '20', rolloverHabilitado: true, cantidadRolloverMaxima: '80' }]);
    const result = await service.close('cycle-1', user);
    expect(result.rolloverAplicado).toEqual({ minutos: 80 });
    expect(result.siguienteCiclo.iniciaEn).toEqual(new Date('2026-01-31T00:00:00.000Z'));
    expect(result.siguienteCiclo.terminaEn).toEqual(new Date('2026-02-15T00:00:00.000Z'));
    expect(bitacora.save).toHaveBeenCalledWith(expect.objectContaining({ accion: 'CICLOS_TELECOM_CERRAR' }));
  });

  it('mantiene cierre idempotente sin crear renovación duplicada', async () => {
    ciclos.findOne.mockResolvedValue({ id: 'cycle-closed', estado: 'cerrado', empresaId: 'e-1' });
    dataSource.transaction.mockImplementation((callback) => callback({ getRepository: jest.fn(() => ciclos) }));
    const result = await service.close('cycle-closed', user);
    expect(result.estado).toBe('cerrado');
    expect(ciclos.save).not.toHaveBeenCalled();
  });
});
