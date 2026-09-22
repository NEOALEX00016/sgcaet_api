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
import { AtributosDinamicosActivoService } from './atributos-dinamicos-activo.service';
import { CreateAtributosDinamicosActivoDto } from './dto/create-atributos-dinamicos-activo.dto';
import { UpdateAtributosDinamicosActivoDto } from './dto/update-atributos-dinamicos-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('atributos-dinamicos-activo')
@RequirePermission('inventario.catalogos.gestionar')
export class AtributosDinamicosActivoController {
  constructor(
    private readonly atributosDinamicosActivoService: AtributosDinamicosActivoService,
  ) {}

  @Post()
  create(
    @Body()
    createAtributosDinamicosActivoDto: CreateAtributosDinamicosActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.atributosDinamicosActivoService.create(
      createAtributosDinamicosActivoDto,
      user,
    );
  }

  @Get()
  findAll(
    @Query('activoId') activoId: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.atributosDinamicosActivoService.findAll(user, activoId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.atributosDinamicosActivoService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    updateAtributosDinamicosActivoDto: UpdateAtributosDinamicosActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.atributosDinamicosActivoService.update(
      id,
      updateAtributosDinamicosActivoDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.atributosDinamicosActivoService.remove(id, user);
    return { ok: true };
  }
}
