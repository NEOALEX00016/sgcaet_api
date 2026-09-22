import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { FormularioVersionesService } from './formulario-versiones.service';
import { CreateFormularioVersioneDto } from './dto/create-formulario-versione.dto';
import { UpdateFormularioVersioneDto } from './dto/update-formulario-versione.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('formulario-versiones')
@RequirePermission('formularios.gestionar')
export class FormularioVersionesController {
  constructor(
    private readonly formularioVersionesService: FormularioVersionesService,
  ) {}

  @Post()
  create(
    @Body() createFormularioVersioneDto: CreateFormularioVersioneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioVersionesService.create(
      createFormularioVersioneDto,
      user,
    );
  }

  @Get()
  findAll(
    @Query('formularioId') formularioId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioVersionesService.findAll(user, formularioId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioVersionesService.findOne(id, user);
  }

  @Get(':id/preview')
  preview(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioVersionesService.preview(id, user);
  }

  @Get(':id/print')
  print(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioVersionesService.print(id, user);
  }

  @Patch(':id/publicar')
  publicar(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioVersionesService.publicar(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFormularioVersioneDto: UpdateFormularioVersioneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioVersionesService.update(
      id,
      updateFormularioVersioneDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.formularioVersionesService.remove(id, user);
    return { ok: true };
  }
}
