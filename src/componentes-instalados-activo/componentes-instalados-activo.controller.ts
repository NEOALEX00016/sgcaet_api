import { Controller, Get, Query } from '@nestjs/common';
import { ComponentesInstaladosActivoService } from './componentes-instalados-activo.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('componentes-instalados-activo')
@RequirePermission('componentes_instalados.ver')
export class ComponentesInstaladosActivoController {
  constructor(private readonly componentesInstaladosActivoService: ComponentesInstaladosActivoService) {}

  @Get()
  findAll(@Query('activoId') activoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.componentesInstaladosActivoService.findByActivo(activoId, false, user);
  }

  @Get('historial')
  history(@Query('activoId') activoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.componentesInstaladosActivoService.findByActivo(activoId, true, user);
  }
}
