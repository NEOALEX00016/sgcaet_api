import { Controller, Get, Param } from '@nestjs/common';
import { ExistenciasRepuestosService } from './existencias-repuestos.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('existencias-repuestos')
export class ExistenciasRepuestosController {
  constructor(private readonly existenciasRepuestosService: ExistenciasRepuestosService) {}

  @Get()
  @RequirePermission('repuestos.ver')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.existenciasRepuestosService.findAll(user);
  }

  @Get(':id')
  @RequirePermission('repuestos.ver')
  findOne(@Param('id') piezaRepuestoId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.existenciasRepuestosService.findOne(piezaRepuestoId, user);
  }
}
