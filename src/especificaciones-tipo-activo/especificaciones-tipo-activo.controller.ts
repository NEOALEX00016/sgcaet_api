import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { EspecificacionesTipoActivoService } from './especificaciones-tipo-activo.service';
import { CreateEspecificacionTipoActivoDto } from './dto/create-especificacion-tipo-activo.dto';
import { UpdateEspecificacionTipoActivoDto } from './dto/update-especificacion-tipo-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('especificaciones-tipo-activo')
export class EspecificacionesTipoActivoController {
  constructor(private readonly service: EspecificacionesTipoActivoService) {}

  @RequirePermission('inventario.especificaciones.ver')
  @Get()
  findAll(
    @Query('tipoActivoId') tipoActivoId: string,
    @Query('categoriaEquipoId') categoriaEquipoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findAll(user, tipoActivoId, categoriaEquipoId);
  }

  @Post()
  @RequirePermission('inventario.especificaciones.crear')
  create(
    @Body() dto: CreateEspecificacionTipoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @RequirePermission('inventario.especificaciones.editar')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateEspecificacionTipoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermission('inventario.especificaciones.eliminar')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }
}
