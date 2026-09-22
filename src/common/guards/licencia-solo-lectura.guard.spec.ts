import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { LicenciaSoloLecturaGuard } from './licencia-solo-lectura.guard';
import { Reflector } from '@nestjs/core';

describe('LicenciaSoloLecturaGuard', () => {
  const licenciasEmpresaServiceMock = {
    evaluarModoSoloLectura: jest.fn(),
  };

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const guard = new LicenciaSoloLecturaGuard(
    licenciasEmpresaServiceMock as never,
    reflector,
  );

  const buildContext = (
    method: string,
    request: Record<string, unknown>,
  ): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, ...request }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('permite metodos de lectura', async () => {
    const context = buildContext('GET', {
      body: {},
      query: {},
      params: {},
      headers: {},
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(
      licenciasEmpresaServiceMock.evaluarModoSoloLectura,
    ).not.toHaveBeenCalled();
  });

  it('bloquea metodos write cuando la licencia esta en solo lectura', async () => {
    licenciasEmpresaServiceMock.evaluarModoSoloLectura.mockResolvedValue({
      soloLectura: true,
      razon: 'Licencia vencida',
    });

    const context = buildContext('POST', {
      user: { empresaId: '11111111-1111-1111-1111-111111111111' },
      query: {},
      params: {},
      headers: {},
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('permite metodos write si la licencia esta vigente', async () => {
    licenciasEmpresaServiceMock.evaluarModoSoloLectura.mockResolvedValue({
      soloLectura: false,
      razon: 'Licencia vigente',
    });

    const context = buildContext('PATCH', {
      user: { empresaId: '11111111-1111-1111-1111-111111111111' },
      query: {},
      params: {},
      headers: {},
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
