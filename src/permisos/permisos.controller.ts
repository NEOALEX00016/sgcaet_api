import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PermisosService } from './permisos.service';
import { CreatePermisoDto } from './dto/create-permiso.dto';
import { UpdatePermisoDto } from './dto/update-permiso.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('permisos')
@RequirePermission('seguridad.permisos.gestionar')
export class PermisosController {
  constructor(private readonly permisosService: PermisosService) {}

  @Post()
  create(
    @Body() createPermisoDto: CreatePermisoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permisosService.create(createPermisoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.permisosService.findAll(user);
  }

  @Get('catalogo/agrupado')
  findCatalogoAgrupado(@CurrentUser() user: AuthenticatedUser) {
    return this.permisosService.findCatalogoAgrupado(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.permisosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermisoDto: UpdatePermisoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permisosService.update(id, updatePermisoDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.permisosService.remove(id, user);
    return { ok: true };
  }
}
