import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PoliticasFormularioTallerService } from './politicas-formulario-taller.service';
import { CreatePoliticasFormularioTallerDto } from './dto/create-politicas-formulario-taller.dto';
import { UpdatePoliticasFormularioTallerDto } from './dto/update-politicas-formulario-taller.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('politicas-formulario-taller')
@RequirePermission('reparaciones.formularios.gestionar')
export class PoliticasFormularioTallerController {
  constructor(
    private readonly politicasFormularioTallerService: PoliticasFormularioTallerService,
  ) {}

  @Post()
  create(
    @Body() dto: CreatePoliticasFormularioTallerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.politicasFormularioTallerService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioTallerService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioTallerService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePoliticasFormularioTallerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.politicasFormularioTallerService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasFormularioTallerService.remove(id, user);
  }
}
