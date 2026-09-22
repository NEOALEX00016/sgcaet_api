import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { DominiosCatalogoActivosService } from './dominios-catalogo-activos.service';
import { CreateDominioCatalogoActivoDto } from './dto/create-dominio-catalogo-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('dominios-catalogo-activos')
export class DominiosCatalogoActivosController {
  constructor(private readonly service: DominiosCatalogoActivosService) {}
  @RequirePermission('inventario.dominios-catalogo.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }
  @Post() @RequirePermission('inventario.dominios-catalogo.crear') create(
    @Body() dto: CreateDominioCatalogoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @Patch(':id') @RequirePermission('inventario.dominios-catalogo.editar') update(
    @Param('id') id: string,
    @Body() dto: CreateDominioCatalogoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @Delete(':id') @RequirePermission('inventario.dominios-catalogo.eliminar') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
