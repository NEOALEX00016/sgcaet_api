import { ProgramacionesMantenimientoController } from './programaciones-mantenimiento.controller';

describe('ProgramacionesMantenimientoController', () => {
  const user = { userId: 'user-1', empresaId: 'empresa-1' } as any;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    generarOrden: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new ProgramacionesMantenimientoController(service as any);

  beforeEach(() => jest.clearAllMocks());

  it('transfiere filtros de estado y activo al listado tenant-scoped', () => {
    controller.findAll(user, 'vencida', 'asset-1');
    expect(service.findAll).toHaveBeenCalledWith(user, {
      estado: 'vencida',
      activoId: 'asset-1',
    });
  });

  it('expone generacion manual de orden con el usuario autenticado', () => {
    controller.generarOrden('schedule-1', user);
    expect(service.generarOrden).toHaveBeenCalledWith('schedule-1', user);
  });
});
