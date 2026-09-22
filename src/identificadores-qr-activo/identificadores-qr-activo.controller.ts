import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { IdentificadoresQrActivoService } from './identificadores-qr-activo.service';
import { CreateIdentificadoresQrActivoDto } from './dto/create-identificadores-qr-activo.dto';
import { UpdateIdentificadoresQrActivoDto } from './dto/update-identificadores-qr-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  RequireAnyPermission,
  RequirePermission,
} from '../auth/decorators/require-permission.decorator';

@Controller('identificadores-qr-activo')
export class IdentificadoresQrActivoController {
  constructor(
    private readonly identificadoresQrActivoService: IdentificadoresQrActivoService,
  ) {}

  @Post()
  @RequirePermission('inventario.catalogos.gestionar')
  create(
    @Body() createIdentificadoresQrActivoDto: CreateIdentificadoresQrActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.identificadoresQrActivoService.create(
      createIdentificadoresQrActivoDto,
      user,
    );
  }

  @Get()
  @RequirePermission('inventario.catalogos.gestionar')
  findAll(
    @Query('activoId') activoId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.identificadoresQrActivoService.findAll(user, activoId);
  }

  @Get('codigo/:codigoQr')
  @RequireAnyPermission('reparaciones.ver', 'inventario.catalogos.gestionar')
  findByCodigoQr(
    @Param('codigoQr') codigoQr: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.identificadoresQrActivoService.findByCodigoQr(codigoQr, user);
  }

  @Get(':id')
  @RequirePermission('inventario.catalogos.gestionar')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.identificadoresQrActivoService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('inventario.catalogos.gestionar')
  update(
    @Param('id') id: string,
    @Body() updateIdentificadoresQrActivoDto: UpdateIdentificadoresQrActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.identificadoresQrActivoService.update(
      id,
      updateIdentificadoresQrActivoDto,
      user,
    );
  }

  @Delete(':id')
  @RequirePermission('inventario.catalogos.gestionar')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.identificadoresQrActivoService.remove(id, user);
    return { ok: true };
  }
}
