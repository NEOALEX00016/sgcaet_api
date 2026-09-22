import { EventosPersonaLaboralController } from './eventos-persona-laboral.controller';
describe('EventosPersonaLaboralController', () => {
  it('propaga el actor JWT al crear eventos', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: '1' }) };
    const controller = new EventosPersonaLaboralController(service as never);
    const dto = {
      personaId: 'p',
      tipoEvento: 'alta_detectada',
      estadoNuevo: 'activo',
    };
    const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });
});
