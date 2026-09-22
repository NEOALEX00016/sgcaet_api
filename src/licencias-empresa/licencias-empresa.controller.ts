import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { LicenciasEmpresaService } from './licencias-empresa.service';
import { CreateLicenciasEmpresaDto } from './dto/create-licencias-empresa.dto';
import { UpdateLicenciasEmpresaDto } from './dto/update-licencias-empresa.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { TargetEmpresaId } from '../auth/decorators/target-empresa-id.decorator';

@Controller('licencias-empresa')
@RequirePermission('plataforma.licencias.gestionar')
export class LicenciasEmpresaController {
  constructor(
    private readonly licenciasEmpresaService: LicenciasEmpresaService,
    private readonly targetTenantContextService: TargetTenantContextService,
  ) {}

  @Post()
  create(
    @Body() createLicenciasEmpresaDto: CreateLicenciasEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.licenciasEmpresaService.create(
          createLicenciasEmpresaDto,
          user,
          targetEmpresaId,
        ),
      );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.licenciasEmpresaService.findAll(targetEmpresaId),
      );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.licenciasEmpresaService.findOne(id, targetEmpresaId),
      );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLicenciasEmpresaDto: UpdateLicenciasEmpresaDto,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    return this.targetTenantContextService
      .resolveTargetEmpresaId(user, targetEmpresaIdHeader)
      .then((targetEmpresaId) =>
        this.licenciasEmpresaService.update(
          id,
          updateLicenciasEmpresaDto,
          user,
          targetEmpresaId,
        ),
      );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @TargetEmpresaId() targetEmpresaIdHeader?: string,
  ) {
    const targetEmpresaId = await this.targetTenantContextService.resolveTargetEmpresaId(
      user,
      targetEmpresaIdHeader,
    );
    await this.licenciasEmpresaService.remove(id, user, targetEmpresaId);
    return { ok: true };
  }

  @Get('solo-lectura')
  evaluarModoSoloLectura(@CurrentUser() user: AuthenticatedUser) {
    return this.licenciasEmpresaService.evaluarModoSoloLectura(user.empresaId);
  }

  @Post('emitir-firmada')
  emitirFirmada(@CurrentUser() user: AuthenticatedUser) {
    return this.licenciasEmpresaService.emitirLicenciaFirmada(user.empresaId);
  }
}
