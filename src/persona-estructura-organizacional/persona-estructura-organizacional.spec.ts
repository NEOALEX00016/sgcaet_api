import { PersonaEstructuraOrganizacionalController } from './persona-estructura-organizacional.controller';
describe('PersonaEstructuraOrganizacionalController', () => {
  it('no recibe tenant desde el DTO', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: '1' }) };
    const controller = new PersonaEstructuraOrganizacionalController(
      service as never,
    );
    const dto = { personaId: 'p', estructuraNodoId: 'n' };
    const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
    await controller.create(dto, user);
    expect(service.create).toHaveBeenCalledWith(dto, user);
  });
});
