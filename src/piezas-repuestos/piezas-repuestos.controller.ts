import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { PiezasRepuestosService } from './piezas-repuestos.service';
import { CreatePiezasRepuestoDto } from './dto/create-piezas-repuesto.dto';
import { UpdatePiezasRepuestoDto } from './dto/update-piezas-repuesto.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('piezas-repuestos')
export class PiezasRepuestosController {
  constructor(private readonly piezasRepuestosService: PiezasRepuestosService) {}

  @Post()
  @RequirePermission('repuestos.catalogo.gestionar')
  create(@Body() dto: CreatePiezasRepuestoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.create(dto, user);
  }

  @Get('aplicables')
  @RequirePermission('repuestos.ver')
  findApplicable(@Query('activoId') activoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.findApplicable(activoId, user);
  }

  @Get()
  @RequirePermission('repuestos.ver')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('repuestos.ver')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermission('repuestos.catalogo.gestionar')
  update(@Param('id') id: string, @Body() dto: UpdatePiezasRepuestoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('repuestos.catalogo.gestionar')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.piezasRepuestosService.remove(id, user);
  }
}
