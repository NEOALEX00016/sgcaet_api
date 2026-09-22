import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ProgramacionesMantenimientoService } from './programaciones-mantenimiento.service';
import { CreateProgramacionesMantenimientoDto } from './dto/create-programaciones-mantenimiento.dto';
import { UpdateProgramacionesMantenimientoDto } from './dto/update-programaciones-mantenimiento.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('programaciones-mantenimiento')
export class ProgramacionesMantenimientoController {
  constructor(
    private readonly programacionesMantenimientoService: ProgramacionesMantenimientoService,
  ) {}

  @Post()
  @RequirePermission('mantenimiento.preventivo.gestionar')
  create(
    @Body() dto: CreateProgramacionesMantenimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programacionesMantenimientoService.create(dto, user);
  }

  @Get()
  @RequirePermission('mantenimiento.preventivo.ver')
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('activoId') activoId?: string,
  ) {
    return this.programacionesMantenimientoService.findAll(user, {
      estado,
      activoId,
    });
  }

  @Get(':id')
  @RequirePermission('mantenimiento.preventivo.ver')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programacionesMantenimientoService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('mantenimiento.preventivo.gestionar')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProgramacionesMantenimientoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programacionesMantenimientoService.update(id, dto, user);
  }

  @Post(':id/generar-orden')
  @RequirePermission('mantenimiento.preventivo.gestionar')
  generarOrden(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.programacionesMantenimientoService.generarOrden(id, user);
  }

  @Delete(':id')
  @RequirePermission('mantenimiento.preventivo.gestionar')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.programacionesMantenimientoService.remove(id, user);
    return { ok: true };
  }
}
