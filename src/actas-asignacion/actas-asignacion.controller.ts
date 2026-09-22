import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ActasAsignacionService } from './actas-asignacion.service';

@Controller('actas-asignacion')
@RequirePermission('asignaciones.gestionar')
export class ActasAsignacionController {
  constructor(private readonly service: ActasAsignacionService) {}

  @Post('preparar-entrega/:asignacionId')
  prepararEntrega(
    @Param('asignacionId') asignacionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.prepararEntrega(asignacionId, user);
  }

  @Get('asignacion/:asignacionId')
  findByAsignacion(@Param('asignacionId') asignacionId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findByAsignacion(asignacionId, user);
  }

  @Get(':actaId/print')
  imprimirActa(
    @Param('actaId') actaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.imprimirActa(actaId, user);
  }

  @Post(':actaId/firmar')
  firmarActa(
    @Param('actaId') actaId: string,
    @Body() payload: { documentoId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.firmarActa(actaId, payload.documentoId, user);
  }
}
