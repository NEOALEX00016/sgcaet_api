import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ConfiguracionSolicitudesService } from './configuracion-solicitudes.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UpdateConfiguracionSolicitudesDto } from './dto/update-configuracion-solicitudes.dto';

@Controller('configuracion-solicitudes')
export class ConfiguracionSolicitudesController {
  constructor(private readonly service: ConfiguracionSolicitudesService) {}
  @RequirePermission('solicitudes.configurar')
  @Get() get(@CurrentUser() user: AuthenticatedUser) {
    return this.service.get(user.empresaId);
  }
  @Patch() @RequirePermission('solicitudes.configurar') update(
    @Body() dto: UpdateConfiguracionSolicitudesDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(user.empresaId, dto);
  }
}
