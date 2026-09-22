import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PersonaEstructuraOrganizacionalService } from './persona-estructura-organizacional.service';
import { CreatePersonaEstructuraOrganizacionalDto } from './dto/create-persona-estructura-organizacional.dto';
import { UpdatePersonaEstructuraOrganizacionalDto } from './dto/update-persona-estructura-organizacional.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('persona-estructura-organizacional')
export class PersonaEstructuraOrganizacionalController {
  constructor(
    private readonly service: PersonaEstructuraOrganizacionalService,
  ) {}
  @RequirePermission('personas.estructura.crear')
  @Post() create(
    @Body() dto: CreatePersonaEstructuraOrganizacionalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @RequirePermission('personas.estructura.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }
  @RequirePermission('personas.estructura.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresaId);
  }
  @RequirePermission('personas.estructura.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdatePersonaEstructuraOrganizacionalDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @RequirePermission('personas.estructura.eliminar')
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
