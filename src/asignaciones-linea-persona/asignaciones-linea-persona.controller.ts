import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { AsignacionesLineaPersonaService } from './asignaciones-linea-persona.service';
import { CreateAsignacionesLineaPersonaDto } from './dto/create-asignaciones-linea-persona.dto';
import { UpdateAsignacionesLineaPersonaDto } from './dto/update-asignaciones-linea-persona.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('asignaciones-linea-persona')
@RequirePermission('telecom.asignaciones.gestionar')
export class AsignacionesLineaPersonaController {
  constructor(private readonly asignacionesLineaPersonaService: AsignacionesLineaPersonaService) {}

  @Post()
  create(@Body() dto: CreateAsignacionesLineaPersonaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesLineaPersonaService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesLineaPersonaService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesLineaPersonaService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAsignacionesLineaPersonaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesLineaPersonaService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesLineaPersonaService.remove(id, user);
  }
}
