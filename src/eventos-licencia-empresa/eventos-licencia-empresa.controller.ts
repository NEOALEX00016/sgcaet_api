import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { EventosLicenciaEmpresaService } from './eventos-licencia-empresa.service';
import { CreateEventosLicenciaEmpresaDto } from './dto/create-eventos-licencia-empresa.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';
@Controller('eventos-licencia-empresa')
export class EventosLicenciaEmpresaController {
  constructor(
    private readonly service: EventosLicenciaEmpresaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}

  @RequirePermission('plataforma.licencias-eventos.crear')
  @Post()
  create(
    @Body() d: CreateEventosLicenciaEmpresaDto,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(
        u,
        targetEmpresaIdHeader,
        'PLATAFORMA_TENANT_GLOBAL_LICENCIAS_EVENTOS',
      )
      .then((targetEmpresaId) => this.service.create(d, u, targetEmpresaId));
  }

  @RequirePermission('plataforma.licencias-eventos.ver')
  @Get()
  findAll(
    @CurrentUser() u: AuthenticatedUser,
    @Query('licenciaEmpresaId') id?: string,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(
        u,
        targetEmpresaIdHeader,
        'PLATAFORMA_TENANT_GLOBAL_LICENCIAS_EVENTOS',
      )
      .then((targetEmpresaId) => this.service.findAll(targetEmpresaId, id));
  }
}
