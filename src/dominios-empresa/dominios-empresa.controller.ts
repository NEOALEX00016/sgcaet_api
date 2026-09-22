import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DominiosEmpresaService } from './dominios-empresa.service';
import { CreateDominiosEmpresaDto } from './dto/create-dominios-empresa.dto';
import { UpdateDominiosEmpresaDto } from './dto/update-dominios-empresa.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';
@Controller('dominios-empresa')
@RequirePermission('plataforma.dominios.gestionar')
export class DominiosEmpresaController {
  constructor(
    private readonly service: DominiosEmpresaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}
  @Post() create(
    @Body() d: CreateDominiosEmpresaDto,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.create(d, u, targetEmpresaId));
  }
  @Get() findAll(
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.findAll(u, targetEmpresaId));
  }
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.findOne(id, u, targetEmpresaId));
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() d: UpdateDominiosEmpresaDto,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.service.update(id, d, u, targetEmpresaId),
      );
  }
}
