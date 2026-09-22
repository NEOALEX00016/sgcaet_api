import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CategoriasEquipoService } from './categorias-equipo.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { CreateCategoriaEquipoDto } from './dto/create-categoria-equipo.dto';
@Controller('categorias-equipo')
export class CategoriasEquipoController {
  constructor(private readonly service: CategoriasEquipoService) {}
  @RequirePermission('inventario.categorias.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user);
  }
  @Post() @RequirePermission('inventario.categorias.crear') create(
    @Body() dto: CreateCategoriaEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @Patch(':id') @RequirePermission('inventario.categorias.editar') update(
    @Param('id') id: string,
    @Body() dto: CreateCategoriaEquipoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @Delete(':id') @RequirePermission('inventario.categorias.eliminar') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
