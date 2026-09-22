import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { UnidadesRepuestosService } from './unidades-repuestos.service';
import { CreateUnidadesRepuestoDto } from './dto/create-unidades-repuesto.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('unidades-repuestos')
export class UnidadesRepuestosController {
  constructor(private readonly unidadesRepuestosService: UnidadesRepuestosService) {}

  @Post()
  @RequirePermission('repuestos.existencias.gestionar')
  create(@Body() dto: CreateUnidadesRepuestoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.unidadesRepuestosService.create(dto, user);
  }

  @Get()
  @RequirePermission('repuestos.ver')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('piezaRepuestoId') piezaRepuestoId?: string, @Query('estado') estado?: string) {
    return this.unidadesRepuestosService.findAll(user, piezaRepuestoId, estado);
  }
}
