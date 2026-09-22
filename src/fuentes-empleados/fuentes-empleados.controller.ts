import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { FuentesEmpleadosService } from './fuentes-empleados.service';
import { CreateFuentesEmpleadoDto } from './dto/create-fuentes-empleado.dto';
import { UpdateFuentesEmpleadoDto } from './dto/update-fuentes-empleado.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('fuentes-empleados')
export class FuentesEmpleadosController {
  constructor(private readonly service: FuentesEmpleadosService) {}
  @RequirePermission('fuentes-empleados.crear')
  @Post() create(
    @Body() dto: CreateFuentesEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @RequirePermission('fuentes-empleados.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }
  @RequirePermission('fuentes-empleados.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresaId);
  }
  @RequirePermission('fuentes-empleados.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateFuentesEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @RequirePermission('fuentes-empleados.eliminar')
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }

  @RequirePermission('fuentes-empleados.probar')
  @Post(':id/probar-conexion')
  probarConexion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.probarConexion(id, user);
  }
}
