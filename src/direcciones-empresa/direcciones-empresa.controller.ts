import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DireccionesEmpresaService } from './direcciones-empresa.service';
import { CreateDireccionesEmpresaDto } from './dto/create-direcciones-empresa.dto';
import { UpdateDireccionesEmpresaDto } from './dto/update-direcciones-empresa.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';
@Controller('direcciones-empresa')
export class DireccionesEmpresaController {
  constructor(
    private readonly service: DireccionesEmpresaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}
  @RequirePermission('plataforma.direcciones.crear')
  @Post() create(
    @Body() d: CreateDireccionesEmpresaDto,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.create(d, u, targetEmpresaId));
  }
  @RequirePermission('plataforma.direcciones.ver')
  @Get() findAll(
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.findAll(u, targetEmpresaId));
  }
  @RequirePermission('plataforma.direcciones.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() u: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(u, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.findOne(id, u, targetEmpresaId));
  }
  @RequirePermission('plataforma.direcciones.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() d: UpdateDireccionesEmpresaDto,
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
