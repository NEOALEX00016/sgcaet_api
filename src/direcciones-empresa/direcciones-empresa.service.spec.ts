import { DireccionesEmpresaService } from './direcciones-empresa.service';

describe('DireccionesEmpresaService', () => {
  const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 'direccion', ...v })),
    find: jest.fn(),
  } as any;
  const audit = { create: jest.fn((v) => v), save: jest.fn() } as any;
  const service = new DireccionesEmpresaService(repo, audit);
  it('crea direccion dentro del tenant autenticado', async () => {
    await service.create(
      {
        tipoDireccion: 'fiscal',
        linea1: 'Calle 1',
        ciudad: 'Santo Domingo',
        provinciaEstado: 'Distrito Nacional',
      },
      user,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 'tenant' }),
    );
    expect(audit.save).toHaveBeenCalled();
  });
});
