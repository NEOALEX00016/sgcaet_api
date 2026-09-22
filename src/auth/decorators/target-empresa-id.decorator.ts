import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const TargetEmpresaId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest<Request>();
    const headerValue =
      request.headers['x-target-empresa-id'] ??
      request.headers['x-empresa-objetivo-id'];
    if (Array.isArray(headerValue)) return headerValue[0];
    return headerValue;
  },
);
