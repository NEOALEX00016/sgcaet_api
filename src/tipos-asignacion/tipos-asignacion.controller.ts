import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { TiposAsignacionService } from './tipos-asignacion.service';
import { CreateTiposAsignacionDto } from './dto/create-tipos-asignacion.dto';
import { UpdateTiposAsignacionDto } from './dto/update-tipos-asignacion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('tipos-asignacion')
export class TiposAsignacionController {
  constructor(private readonly tiposAsignacionService: TiposAsignacionService) {}

  @RequirePermission('formularios.gestionar')
  @Post()
  create(
    @Body() createTiposAsignacionDto: CreateTiposAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposAsignacionService.create(createTiposAsignacionDto, user);
  }

  @RequirePermission('formularios.gestionar')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tiposAsignacionService.findAll(user);
  }

  @RequirePermission('formularios.gestionar')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tiposAsignacionService.findOne(id, user);
  }

  @RequirePermission('formularios.gestionar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTiposAsignacionDto: UpdateTiposAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposAsignacionService.update(id, updateTiposAsignacionDto, user);
  }

  @RequirePermission('formularios.gestionar')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tiposAsignacionService.remove(id, user);
  }
}
