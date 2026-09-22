import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AsignacionesService } from './asignaciones.service';
import { CreateAsignacionDto } from './dto/create-asignacion.dto';
import { UpdateAsignacionDto } from './dto/update-asignacion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('asignaciones')
@RequirePermission('asignaciones.gestionar')
export class AsignacionesController {
  constructor(private readonly asignacionesService: AsignacionesService) {}

  @Post()
  create(
    @Body() createAsignacionDto: CreateAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionesService.create(createAsignacionDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAsignacionDto: UpdateAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionesService.update(id, updateAsignacionDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.asignacionesService.remove(id, user);
    return { ok: true };
  }

  @Post(':id/autorizar')
  autorizar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesService.autorizar(id, user);
  }

  @Post(':id/completar-entrega')
  completarEntrega(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesService.completarEntrega(id, user);
  }
}
