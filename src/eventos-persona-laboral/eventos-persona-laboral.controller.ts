import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EventosPersonaLaboralService } from './eventos-persona-laboral.service';
import { CreateEventosPersonaLaboralDto } from './dto/create-eventos-persona-laboral.dto';
import { UpdateEventosPersonaLaboralDto } from './dto/update-eventos-persona-laboral.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
@Controller('eventos-persona-laboral')
export class EventosPersonaLaboralController {
  constructor(private readonly service: EventosPersonaLaboralService) {}
  @RequirePermission('personas.eventos-laborales.crear')
  @Post() create(
    @Body() dto: CreateEventosPersonaLaboralDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }
  @RequirePermission('personas.eventos-laborales.ver')
  @Get() findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }
  @RequirePermission('personas.eventos-laborales.ver')
  @Get(':id') findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(id, user.empresaId);
  }
  @RequirePermission('personas.eventos-laborales.editar')
  @Patch(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateEventosPersonaLaboralDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user);
  }
  @RequirePermission('personas.eventos-laborales.eliminar')
  @Delete(':id') remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.remove(id, user);
  }
}
