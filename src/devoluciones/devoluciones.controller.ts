import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { CreateDevolucionDto } from './dto/create-devolucion.dto';
import { UpdateDevolucionDto } from './dto/update-devolucion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('devoluciones')
@RequirePermission('devoluciones.gestionar')
export class DevolucionesController {
  constructor(private readonly devolucionesService: DevolucionesService) {}

  @Post()
  create(
    @Body() createDevolucionDto: CreateDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.create(createDevolucionDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.findOne(id, user);
  }

  @Post(':id/confirmar')
  confirmar(@Param('id') id: string, @Body() payload: { documentoId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.devolucionesService.confirmar(id, payload.documentoId, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateDevolucionDto: UpdateDevolucionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.devolucionesService.update(id, updateDevolucionDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.devolucionesService.remove(id, user);
    return { ok: true };
  }
}
