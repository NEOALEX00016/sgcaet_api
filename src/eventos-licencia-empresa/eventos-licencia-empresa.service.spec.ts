import { NotFoundException } from '@nestjs/common';
import { EventosLicenciaEmpresaService } from './eventos-licencia-empresa.service';

describe('EventosLicenciaEmpresaService', () => {
  const user = { userId: 'actor', empresaId: 'tenant', correo: 'a@b.test' };
  const repo = {
    create: jest.fn((v) => v),
    save: jest.fn((v) => Promise.resolve({ id: 'evento', ...v })),
    find: jest.fn(),
  } as any;
  const licencias = { findOne: jest.fn() } as any;
  const audit = { create: jest.fn((v) => v), save: jest.fn() } as any;
  const service = new EventosLicenciaEmpresaService(repo, licencias, audit);
  it('valida licencia del tenant y registra actor autenticado', async () => {
    licencias.findOne.mockResolvedValue({
      id: 'licencia',
      empresaId: 'tenant',
    });
    await service.create(
      { licenciaEmpresaId: 'licencia', tipoEvento: 'renovada' },
      user,
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 'tenant', realizadoPor: 'actor' }),
    );
    expect(audit.save).toHaveBeenCalled();
  });
  it('rechaza FK de licencia fuera del tenant', async () => {
    licencias.findOne.mockResolvedValue(null);
    await expect(
      service.create(
        { licenciaEmpresaId: 'otra', tipoEvento: 'renovada' },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('permite scope explicito de tenant objetivo para actor global', async () => {
    licencias.findOne.mockResolvedValue({
      id: 'licencia',
      empresaId: 'tenant-objetivo',
    });
    await service.create(
      { licenciaEmpresaId: 'licencia', tipoEvento: 'renovada' },
      user,
      'tenant-objetivo',
    );
    expect(licencias.findOne).toHaveBeenCalledWith({
      where: { id: 'licencia', empresaId: 'tenant-objetivo' },
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ empresaId: 'tenant-objetivo' }),
    );
  });

  it('lista eventos usando tenant objetivo explicitamente', async () => {
    repo.find.mockResolvedValue([]);
    await service.findAll('tenant-objetivo', 'licencia');
    expect(repo.find).toHaveBeenCalledWith({
      where: { empresaId: 'tenant-objetivo', licenciaEmpresaId: 'licencia' },
      order: { realizadoEn: 'DESC' },
    });
  });
});
