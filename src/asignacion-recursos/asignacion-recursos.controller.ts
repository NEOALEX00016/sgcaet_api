import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { AsignacionRecursosService } from './asignacion-recursos.service';
import { CreateAsignacionRecursoDto } from './dto/create-asignacion-recurso.dto';
import { UpdateAsignacionRecursoDto } from './dto/update-asignacion-recurso.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('asignacion-recursos')
@RequirePermission('inventario.asignaciones.gestionar')
export class AsignacionRecursosController {
  constructor(
    private readonly asignacionRecursosService: AsignacionRecursosService,
  ) {}

  @Post()
  create(
    @Body() createAsignacionRecursoDto: CreateAsignacionRecursoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionRecursosService.create(
      createAsignacionRecursoDto,
      user,
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.asignacionRecursosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionRecursosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAsignacionRecursoDto: UpdateAsignacionRecursoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionRecursosService.update(
      id,
      updateAsignacionRecursoDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.asignacionRecursosService.remove(id, user);
    return { ok: true };
  }
}
