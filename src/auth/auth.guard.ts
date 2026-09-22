import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { LicenciasEmpresaService } from '../licencias-empresa/licencias-empresa.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
    private readonly licenciasEmpresaService: LicenciasEmpresaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token Bearer requerido');
    }

    try {
      const token = authorization.slice(7);
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        empresaId: string;
        correo: string;
      }>(token);
      await this.authService.validateUser(payload.sub, payload.empresaId);
      request.user = {
        userId: payload.sub,
        empresaId: payload.empresaId,
        correo: payload.correo,
      };

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        const licencia =
          await this.licenciasEmpresaService.evaluarModoSoloLectura(
            payload.empresaId,
          );
        if (licencia.soloLectura) {
          throw new UnauthorizedException(
            `Operacion no disponible para el tenant: ${licencia.razon}`,
          );
        }
      }

      return true;
    } catch {
      throw new UnauthorizedException('Token invalido o expirado');
    }
  }
}
