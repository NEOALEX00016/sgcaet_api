import { Body, Controller, Get, Headers, Patch, Post } from '@nestjs/common';
import { ConfiguracionOperativaTenantService } from './configuracion-operativa-tenant.service';
import { UpdateConfiguracionOperativaTenantDto } from './dto/update-configuracion-operativa-tenant.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { Public } from '../auth/decorators/public.decorator';

@Controller('configuracion-operativa-tenant')
export class ConfiguracionOperativaTenantController {
  constructor(private readonly service: ConfiguracionOperativaTenantService) {}

  @Get()
  @RequirePermission('solicitudes.configurar')
  get(@CurrentUser() user: AuthenticatedUser) {
    return this.service.get(user.empresaId);
  }

  @Patch()
  @RequirePermission('solicitudes.configurar')
  update(
    @Body() dto: UpdateConfiguracionOperativaTenantDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(user.empresaId, dto);
  }

  @Post('validar-plataforma')
  @RequirePermission('solicitudes.configurar')
  validarPlataforma(@CurrentUser() user: AuthenticatedUser) {
    return this.service.validarConexionPlataforma(user.empresaId);
  }

  @Post('validar-licencia-machine')
  @Public()
  machineValidate(
    @Headers('x-tenant-id') tenantId: string,
    @Headers('x-platform-api-key') apiKey: string,
  ) {
    return this.service.validarLicenciaMachine(tenantId, apiKey);
  }

  @Get('probar-correo')
  @RequirePermission('solicitudes.configurar')
  probarCorreo(@CurrentUser() user: AuthenticatedUser) {
    return this.service.probarCorreo(user.empresaId, user.userId);
  }

  @Get('probar-almacenamiento')
  @RequirePermission('solicitudes.configurar')
  probarAlmacenamiento(@CurrentUser() user: AuthenticatedUser) {
    return this.service.probarAlmacenamiento(user.empresaId, user.userId);
  }
}
