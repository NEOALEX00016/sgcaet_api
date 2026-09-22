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
import { IncidenciasService } from './incidencias.service';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto';
import { UpdateIncidenciaDto } from './dto/update-incidencia.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('incidencias')
export class IncidenciasController {
  constructor(private readonly incidenciasService: IncidenciasService) {}

  @RequirePermission('incidencias.crear')
  @Post()
  create(
    @Body() createIncidenciaDto: CreateIncidenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidenciasService.create(createIncidenciaDto, user);
  }

  @RequirePermission('incidencias.ver')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
    @Query('asignadaA') asignadaA?: string,
  ) {
    return this.incidenciasService.findAll(
      user.empresaId,
      estado,
      prioridad,
      asignadaA,
    );
  }

  @RequirePermission('incidencias.ver')
  @Get('mine')
  findMine(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: string,
    @Query('prioridad') prioridad?: string,
  ) {
    return this.incidenciasService.findMine(user, estado, prioridad);
  }

  @RequirePermission('incidencias.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.incidenciasService.findOne(id, user.empresaId);
  }

  @RequirePermission('incidencias.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateIncidenciaDto: UpdateIncidenciaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incidenciasService.update(id, updateIncidenciaDto, user);
  }

  @RequirePermission('incidencias.eliminar')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.incidenciasService.remove(id, user);
    return { ok: true };
  }
}
