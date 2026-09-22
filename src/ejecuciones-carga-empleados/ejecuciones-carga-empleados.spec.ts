import { EjecucionesCargaEmpleadosController } from './ejecuciones-carga-empleados.controller';
describe('EjecucionesCargaEmpleadosController', () => {
  it('usa el tenant autenticado al listar cargas', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    const controller = new EjecucionesCargaEmpleadosController(
      service as never,
    );
    await controller.findAll({
      userId: 'actor',
      empresaId: 'tenant',
      correo: 'a@b.test',
    });
    expect(service.findAll).toHaveBeenCalledWith('tenant');
  });
});
