import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Reflector } from '@nestjs/core';
import { LicenciasEmpresaService } from '../../licencias-empresa/licencias-empresa.service';
import type { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';

type MetodoHttp =
  'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

@Injectable()
export class LicenciaSoloLecturaGuard implements CanActivate {
  private readonly metodosEscritura: MetodoHttp[] = [
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
  ];

  constructor(
    private readonly licenciasEmpresaService: LicenciasEmpresaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const method = request.method as MetodoHttp;

    if (!this.metodosEscritura.includes(method)) {
      return true;
    }

    const empresaId = request.user?.empresaId;
    if (!empresaId) {
      return true;
    }

    const estado =
      await this.licenciasEmpresaService.evaluarModoSoloLectura(empresaId);
    if (estado.soloLectura) {
      throw new ForbiddenException(
        `Operacion de escritura bloqueada para tenant en modo solo lectura: ${estado.razon}`,
      );
    }

    return true;
  }
}
