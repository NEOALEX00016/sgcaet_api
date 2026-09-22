import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { MarcasEmpresaService } from './marcas-empresa.service';
import { CreateMarcasEmpresaDto } from './dto/create-marcas-empresa.dto';
import { UpdateMarcasEmpresaDto } from './dto/update-marcas-empresa.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';
@Controller('marcas-empresa')
@RequirePermission('plataforma.marcas.gestionar')
export class MarcasEmpresaController {
  constructor(
    private readonly service: MarcasEmpresaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}
  @Post() create(
    @Body() dto: CreateMarcasEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.service.create(dto, user, targetEmpresaId),
      );
  }
  @Get() findAll(
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) => this.service.findAll(user, targetEmpresaId));
  }
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.service.findOne(id, user, targetEmpresaId),
      );
  }
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateMarcasEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.service.update(id, dto, user, targetEmpresaId),
      );
  }
}
