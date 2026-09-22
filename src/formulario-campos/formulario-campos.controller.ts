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
import { FormularioCamposService } from './formulario-campos.service';
import { CreateFormularioCampoDto } from './dto/create-formulario-campo.dto';
import { UpdateFormularioCampoDto } from './dto/update-formulario-campo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('formulario-campos')
export class FormularioCamposController {
  constructor(
    private readonly formularioCamposService: FormularioCamposService,
  ) {}

  @RequirePermission('formularios.campos.crear')
  @Post()
  create(
    @Body() dto: CreateFormularioCampoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioCamposService.create(dto, user);
  }

  @RequirePermission('formularios.campos.ver')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('formularioVersionId') formularioVersionId?: string,
  ) {
    return this.formularioCamposService.findAll(
      user.empresaId,
      formularioVersionId,
    );
  }

  @RequirePermission('formularios.campos.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioCamposService.findOne(id, user.empresaId);
  }

  @RequirePermission('formularios.campos.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateFormularioCampoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioCamposService.update(id, dto, user);
  }

  @RequirePermission('formularios.campos.eliminar')
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioCamposService.remove(id, user);
  }
}
