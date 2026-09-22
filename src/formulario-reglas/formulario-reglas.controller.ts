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
import { FormularioReglasService } from './formulario-reglas.service';
import { CreateFormularioReglaDto } from './dto/create-formulario-regla.dto';
import { UpdateFormularioReglaDto } from './dto/update-formulario-regla.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('formulario-reglas')
export class FormularioReglasController {
  constructor(
    private readonly formularioReglasService: FormularioReglasService,
  ) {}

  @RequirePermission('formularios.reglas.crear')
  @Post()
  create(
    @Body() dto: CreateFormularioReglaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioReglasService.create(dto, user);
  }

  @RequirePermission('formularios.reglas.ver')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('formularioVersionId') formularioVersionId?: string,
  ) {
    return this.formularioReglasService.findAll(
      user.empresaId,
      formularioVersionId,
    );
  }

  @RequirePermission('formularios.reglas.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioReglasService.findOne(id, user.empresaId);
  }

  @RequirePermission('formularios.reglas.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFormularioReglaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioReglasService.update(id, dto, user);
  }

  @RequirePermission('formularios.reglas.eliminar')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioReglasService.remove(id, user);
  }
}
