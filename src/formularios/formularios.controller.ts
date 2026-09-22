import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FormulariosService } from './formularios.service';
import { CreateFormularioDto } from './dto/create-formulario.dto';
import { UpdateFormularioDto } from './dto/update-formulario.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('formularios')
@RequirePermission('formularios.gestionar')
export class FormulariosController {
  constructor(private readonly formulariosService: FormulariosService) {}

  @Post()
  create(
    @Body() createFormularioDto: CreateFormularioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formulariosService.create(createFormularioDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.formulariosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.formulariosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateFormularioDto: UpdateFormularioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.formulariosService.update(id, updateFormularioDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.formulariosService.remove(id, user);
    return { ok: true };
  }
}
