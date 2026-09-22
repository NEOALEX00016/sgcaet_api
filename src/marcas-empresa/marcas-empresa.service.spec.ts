import { BadRequestException } from '@nestjs/common';
import { MarcasEmpresaService } from './marcas-empresa.service';

describe('MarcasEmpresaService', () => {
  const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
  const repo = {
    findOne: jest.fn(),
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 'marca', ...v })),
  } as any;
  const audit = { create: jest.fn((v) => v), save: jest.fn() } as any;
  const service = new MarcasEmpresaService(repo, audit);

  beforeEach(() => jest.clearAllMocks());
  it('fuerza tenant autenticado y registra bitacora', async () => {
    repo.findOne.mockResolvedValueOnce(null);
    await service.create({ logoUrl: 'https://example.com/logo.png' }, user);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 'tenant' }),
    );
    expect(audit.save).toHaveBeenCalled();
  });
  it('rechaza marca duplicada por empresa', async () => {
    repo.findOne.mockResolvedValueOnce({ id: 'existente' });
    await expect(service.create({}, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
