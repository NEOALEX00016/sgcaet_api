import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { RolPermisosService } from './rol-permisos.service';
import { CreateRolPermisoDto } from './dto/create-rol-permiso.dto';
import { UpdateRolPermisoDto } from './dto/update-rol-permiso.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('rol-permisos')
@RequirePermission('seguridad.permisos.gestionar')
export class RolPermisosController {
  constructor(private readonly rolPermisosService: RolPermisosService) {}

  @Post()
  create(
    @Body() createRolPermisoDto: CreateRolPermisoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolPermisosService.create(createRolPermisoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.rolPermisosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.rolPermisosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRolPermisoDto: UpdateRolPermisoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.rolPermisosService.update(id, updateRolPermisoDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.rolPermisosService.remove(id, user);
    return { ok: true };
  }
}
