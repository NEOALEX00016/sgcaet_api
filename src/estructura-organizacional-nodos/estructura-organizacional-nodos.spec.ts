import { EstructuraOrganizacionalNodosController } from './estructura-organizacional-nodos.controller';
describe('EstructuraOrganizacionalNodosController', () => {
  it('propaga el usuario autenticado al crear', async () => {
    const service = { create: jest.fn().mockResolvedValue({ id: '1' }) };
    const controller = new EstructuraOrganizacionalNodosController(
      service as never,
    );
    const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
    await controller.create(
      { tipoNodo: 'area', codigo: 'A', nombre: 'Area' },
      user,
    );
    expect(service.create).toHaveBeenCalledWith(
      { tipoNodo: 'area', codigo: 'A', nombre: 'Area' },
      user,
    );
  });
});
