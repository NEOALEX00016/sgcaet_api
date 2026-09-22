import { Controller, Get, Query } from '@nestjs/common';
import { HistorialComponentesActivoService } from './historial-componentes-activo.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('historial-componentes-activo')
@RequirePermission('reparaciones.gestionar')
export class HistorialComponentesActivoController {
  constructor(private readonly historialComponentesActivoService: HistorialComponentesActivoService) {}

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('activoId') activoId?: string,
  ) {
    return this.historialComponentesActivoService.findAll(user, activoId);
  }
}
