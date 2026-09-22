import { FuentesEmpleadosController } from './fuentes-empleados.controller';
describe('FuentesEmpleadosController', () => {
  it('usa el tenant del usuario autenticado al listar', async () => {
    const service = { findAll: jest.fn().mockResolvedValue([]) };
    const controller = new FuentesEmpleadosController(service as never);
    await controller.findAll({
      userId: 'actor',
      empresaId: 'tenant',
      correo: 'a@b.test',
    });
    expect(service.findAll).toHaveBeenCalledWith('tenant');
  });
});
