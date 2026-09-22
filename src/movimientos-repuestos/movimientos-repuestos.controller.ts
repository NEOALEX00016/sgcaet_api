import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { MovimientosRepuestosService } from './movimientos-repuestos.service';
import { EntradaMovimientoRepuestoDto } from './dto/entrada-movimiento-repuesto.dto';
import { AjusteMovimientoRepuestoDto } from './dto/ajuste-movimiento-repuesto.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('movimientos-repuestos')
export class MovimientosRepuestosController {
  constructor(private readonly movimientosRepuestosService: MovimientosRepuestosService) {}

  @Post('entrada')
  @RequirePermission('repuestos.existencias.gestionar')
  createEntry(@Body() dto: EntradaMovimientoRepuestoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.movimientosRepuestosService.createEntry(dto, user);
  }

  @Post('ajuste')
  @RequirePermission('repuestos.existencias.gestionar')
  createAdjustment(@Body() dto: AjusteMovimientoRepuestoDto, @CurrentUser() user: AuthenticatedUser) {
    return this.movimientosRepuestosService.createAdjustment(dto, user);
  }

  @Get()
  @RequirePermission('repuestos.movimientos.ver')
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('piezaRepuestoId') piezaRepuestoId?: string) {
    return this.movimientosRepuestosService.findAll(user, piezaRepuestoId);
  }
}
