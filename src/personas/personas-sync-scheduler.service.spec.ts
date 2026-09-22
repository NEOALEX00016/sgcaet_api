import { PersonasSyncSchedulerService } from './personas-sync-scheduler.service';
import { PersonasService } from './personas.service';

describe('PersonasSyncSchedulerService', () => {
  const fuentesRepository = {
    find: jest.fn(),
    update: jest.fn(),
  };
  const usuariosRepository = {
    findOne: jest.fn(),
  };
  const personasService = {
    importFromApi: jest.fn(),
  } as unknown as PersonasService;

  const service = new PersonasSyncSchedulerService(
    fuentesRepository as never,
    usuariosRepository as never,
    personasService,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ejecuta sincronizacion automatica para fuentes API activas vencidas', async () => {
    fuentesRepository.find.mockResolvedValue([
      {
        id: 'fuente-1',
        empresaId: 'empresa-1',
        estado: 'activa',
        tipoFuente: 'api_rest',
        mapeoCampos: { syncIntervalMinutes: 30 },
      },
    ]);
    usuariosRepository.findOne.mockResolvedValue({
      id: 'user-1',
      empresaId: 'empresa-1',
      correo: 'sync@empresa.test',
    });
    (personasService.importFromApi as jest.Mock).mockResolvedValue({ ok: true });

    const processed = await service.runCycle();

    expect(processed).toBe(1);
    expect(personasService.importFromApi).toHaveBeenCalledWith(
      { fuenteEmpleadosId: 'fuente-1' },
      {
        userId: 'user-1',
        empresaId: 'empresa-1',
        correo: 'sync@empresa.test',
      },
    );
    expect(fuentesRepository.update).toHaveBeenCalledWith(
      { id: 'fuente-1' },
      expect.objectContaining({
        ultimaSincronizacionEn: expect.any(Date),
        proximaSincronizacionEn: expect.any(Date),
      }),
    );
  });

  it('reprograma proxima sincronizacion cuando no existe actor activo', async () => {
    fuentesRepository.find.mockResolvedValue([
      {
        id: 'fuente-2',
        empresaId: 'empresa-2',
        estado: 'activa',
        tipoFuente: 'api_rest',
        mapeoCampos: {},
      },
    ]);
    usuariosRepository.findOne.mockResolvedValue(null);

    await service.runCycle();

    expect(personasService.importFromApi).not.toHaveBeenCalled();
    expect(fuentesRepository.update).toHaveBeenCalledWith(
      { id: 'fuente-2' },
      expect.objectContaining({
        proximaSincronizacionEn: expect.any(Date),
      }),
    );
  });
});
