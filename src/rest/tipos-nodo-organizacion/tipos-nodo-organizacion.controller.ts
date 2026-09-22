import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { TiposNodoOrganizacionService } from './tipos-nodo-organizacion.service';
import { CreateTiposNodoOrganizacionDto } from './dto/create-tipos-nodo-organizacion.dto';
import { UpdateTiposNodoOrganizacionDto } from './dto/update-tipos-nodo-organizacion.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';
import { RequirePermission } from '../../auth/decorators/require-permission.decorator';

@Controller('tipos-nodo-organizacion')
export class TiposNodoOrganizacionController {
  constructor(
    private readonly tiposNodoOrganizacionService: TiposNodoOrganizacionService,
  ) {}

  @RequirePermission('estructura.nodos.ver')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tiposNodoOrganizacionService.findAll(user);
  }

  @RequirePermission('estructura.nodos.crear')
  @Post()
  create(
    @Body() createTiposNodoOrganizacionDto: CreateTiposNodoOrganizacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposNodoOrganizacionService.create(
      createTiposNodoOrganizacionDto,
      user,
    );
  }

  @RequirePermission('estructura.nodos.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tiposNodoOrganizacionService.findOne(id, user);
  }

  @RequirePermission('estructura.nodos.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTiposNodoOrganizacionDto: UpdateTiposNodoOrganizacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposNodoOrganizacionService.update(
      id,
      updateTiposNodoOrganizacionDto,
      user,
    );
  }

  @RequirePermission('estructura.nodos.eliminar')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tiposNodoOrganizacionService.remove(id, user);
  }
}
