import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { EmpresasService } from './empresas.service';
import { CreateEmpresaDto } from './dto/create-empresa.dto';
import { UpdateEmpresaDto } from './dto/update-empresa.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

@Controller('empresas')
@RequirePermission('plataforma.empresas.gestionar')
export class EmpresasController {
  constructor(
    private readonly empresasService: EmpresasService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}

  @Post()
  create(
    @Body() createEmpresaDto: CreateEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, undefined, 'PLATAFORMA_TENANT_GLOBAL_VALIDAR')
      .then(() => this.empresasService.create(createEmpresaDto, user));
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, undefined, 'PLATAFORMA_TENANT_GLOBAL_VALIDAR')
      .then(() => this.empresasService.findAll());
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, undefined, 'PLATAFORMA_TENANT_GLOBAL_VALIDAR')
      .then(() => this.empresasService.findOne(id));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateEmpresaDto: UpdateEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, undefined, 'PLATAFORMA_TENANT_GLOBAL_VALIDAR')
      .then(() => this.empresasService.update(id, updateEmpresaDto, user));
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.targetTenantContextService.resolveTargetEmpresaId(
      user,
      undefined,
      'PLATAFORMA_TENANT_GLOBAL_VALIDAR',
    );
    await this.empresasService.remove(id, user);
    return { ok: true };
  }
}
