import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EjecucionesCargaEmpleadosService } from './ejecuciones-carga-empleados.service';
import { CreateEjecucionesCargaEmpleadoDto } from './dto/create-ejecuciones-carga-empleado.dto';
import { UpdateEjecucionesCargaEmpleadoDto } from './dto/update-ejecuciones-carga-empleado.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('ejecuciones-carga-empleados')
export class EjecucionesCargaEmpleadosController {
  constructor(private readonly service: EjecucionesCargaEmpleadosService) {}
  @RequirePermission('personas.ejecuciones-carga.crear')
  @Post() create(
    @Body() dto: CreateEjecucionesCargaEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @RequirePermission('personas.ejecuciones-carga.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }
  @RequirePermission('personas.ejecuciones-carga.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresaId);
  }
  @RequirePermission('personas.ejecuciones-carga.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateEjecucionesCargaEmpleadoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @RequirePermission('personas.ejecuciones-carga.eliminar')
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
