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
import { FormularioRespuestasService } from './formulario-respuestas.service';
import { CreateFormularioRespuestaDto } from './dto/create-formulario-respuesta.dto';
import { UpdateFormularioRespuestaDto } from './dto/update-formulario-respuesta.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('formulario-respuestas')
@RequirePermission('formularios.respuestas.gestionar')
export class FormularioRespuestasController {
  constructor(
    private readonly formularioRespuestasService: FormularioRespuestasService,
  ) {}

  @Post()
  create(
    @Body() createFormularioRespuestaDto: CreateFormularioRespuestaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioRespuestasService.create(
      createFormularioRespuestaDto,
      user,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('entidadRelacionada') entidadRelacionada?: string,
    @Query('entidadRelacionadaId') entidadRelacionadaId?: string,
    @Query('formularioVersionId') formularioVersionId?: string,
  ) {
    return this.formularioRespuestasService.findAll(user, {
      entidadRelacionada: entidadRelacionada?.trim() || undefined,
      entidadRelacionadaId: entidadRelacionadaId?.trim() || undefined,
      formularioVersionId: formularioVersionId?.trim() || undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formularioRespuestasService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFormularioRespuestaDto: UpdateFormularioRespuestaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formularioRespuestasService.update(
      id,
      updateFormularioRespuestaDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.formularioRespuestasService.remove(id, user);
    return { ok: true };
  }
}
