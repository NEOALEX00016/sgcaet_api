import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PoliticasFormularioAsignacionService } from './politicas-formulario-asignacion.service';
import { CreatePoliticasFormularioAsignacionDto } from './dto/create-politicas-formulario-asignacion.dto';
import { UpdatePoliticasFormularioAsignacionDto } from './dto/update-politicas-formulario-asignacion.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('politicas-formulario-asignacion')
export class PoliticasFormularioAsignacionController {
  constructor(private readonly politicasFormularioAsignacionService: PoliticasFormularioAsignacionService) {}

  @RequirePermission('formularios.gestionar')
  @Post()
  create(
    @Body() createPoliticasFormularioAsignacionDto: CreatePoliticasFormularioAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.politicasFormularioAsignacionService.create(createPoliticasFormularioAsignacionDto, user);
  }

  @RequirePermission('formularios.gestionar')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioAsignacionService.findAll(user);
  }

  @RequirePermission('formularios.gestionar')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioAsignacionService.findOne(id, user);
  }

  @RequirePermission('formularios.gestionar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePoliticasFormularioAsignacionDto: UpdatePoliticasFormularioAsignacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.politicasFormularioAsignacionService.update(id, updatePoliticasFormularioAsignacionDto, user);
  }

  @RequirePermission('formularios.gestionar')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioAsignacionService.remove(id, user);
  }
}
