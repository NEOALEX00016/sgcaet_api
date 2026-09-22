import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { TargetTenantContextService } from './target-tenant-context.service';

describe('TargetTenantContextService', () => {
  const empresasRepository = { findOne: jest.fn() };
  const usuariosRepository = { findOne: jest.fn() };
  const bitacoraRepository = { create: jest.fn((v) => v), save: jest.fn() };

  const service = new TargetTenantContextService(
    empresasRepository as never,
    usuariosRepository as never,
    bitacoraRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects actor without platform owner identity', async () => {
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: false,
    });

    await expect(
      service.resolveTargetEmpresaId(
        {
          userId: 'user-1',
          empresaId: 'empresa-actor',
          correo: 'actor@test.local',
        },
        'empresa-target',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects unknown target tenant', async () => {
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: true,
    });
    empresasRepository.findOne.mockResolvedValue(null);

    await expect(
      service.resolveTargetEmpresaId(
        {
          userId: 'owner-1',
          empresaId: 'empresa-actor',
          correo: 'owner@test.local',
        },
        'empresa-inexistente',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('resolves and audits explicit target tenant', async () => {
    usuariosRepository.findOne.mockResolvedValue({
      esPropietarioPlataforma: true,
    });
    empresasRepository.findOne.mockResolvedValue({ id: 'empresa-target' });

    const result = await service.resolveTargetEmpresaId(
      {
        userId: 'owner-1',
        empresaId: 'empresa-actor',
        correo: 'owner@test.local',
      },
      'empresa-target',
    );

    expect(result).toBe('empresa-target');
    expect(bitacoraRepository.save).toHaveBeenCalledTimes(1);
  });
});
