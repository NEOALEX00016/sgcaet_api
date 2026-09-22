import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CambiosEquipoService } from './cambios-equipo.service';
import { CreateCambioEquipoDto } from './dto/create-cambio-equipo.dto';
import { UpdateCambioEquipoDto } from './dto/update-cambio-equipo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('cambios-equipo')
@RequirePermission('inventario.asignaciones.gestionar')
export class CambiosEquipoController {
  constructor(private readonly cambiosEquipoService: CambiosEquipoService) {}

  @Post()
  create(
    @Body() createCambioEquipoDto: CreateCambioEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cambiosEquipoService.create(createCambioEquipoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.cambiosEquipoService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.cambiosEquipoService.findOne(id, user);
  }

  @Post(':id/confirmar')
  confirmar(@Param('id') id: string, @Body() payload: { documentoId: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.cambiosEquipoService.confirmar(id, payload.documentoId, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCambioEquipoDto: UpdateCambioEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cambiosEquipoService.update(id, updateCambioEquipoDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.cambiosEquipoService.remove(id, user);
    return { ok: true };
  }
}
