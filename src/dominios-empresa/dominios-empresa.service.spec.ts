import { DominiosEmpresaService } from './dominios-empresa.service';

describe('DominiosEmpresaService', () => {
  const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 'dominio', ...v })),
  } as any;
  const audit = { create: jest.fn((v) => v), save: jest.fn() } as any;
  const service = new DominiosEmpresaService(repo, audit);
  beforeEach(() => jest.clearAllMocks());
  it('normaliza hostname y aplica tenant scope', async () => {
    repo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    await service.create({ hostname: 'APP.EXAMPLE.COM' }, user);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: 'app.example.com',
        empresaId: 'tenant',
      }),
    );
  });
});
