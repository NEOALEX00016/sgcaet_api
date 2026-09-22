import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EstructuraOrganizacionalNodosService } from './estructura-organizacional-nodos.service';
import { CreateEstructuraOrganizacionalNodoDto } from './dto/create-estructura-organizacional-nodo.dto';
import { UpdateEstructuraOrganizacionalNodoDto } from './dto/update-estructura-organizacional-nodo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('estructura-organizacional-nodos')
export class EstructuraOrganizacionalNodosController {
  constructor(private readonly service: EstructuraOrganizacionalNodosService) {}
  @RequirePermission('estructura.nodos.crear')
  @Post() create(
    @Body() dto: CreateEstructuraOrganizacionalNodoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @RequirePermission('estructura.nodos.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }
  @RequirePermission('estructura.nodos.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresaId);
  }
  @RequirePermission('estructura.nodos.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateEstructuraOrganizacionalNodoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @RequirePermission('estructura.nodos.eliminar')
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
