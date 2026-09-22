import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { TiposActivoService } from './tipos-activo.service';
import { CreateTiposActivoDto } from './dto/create-tipos-activo.dto';
import { UpdateTiposActivoDto } from './dto/update-tipos-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('tipos-activo')
@RequirePermission('inventario.catalogos.gestionar')
export class TiposActivoController {
  constructor(private readonly tiposActivoService: TiposActivoService) {}

  @Post()
  create(
    @Body() createTiposActivoDto: CreateTiposActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposActivoService.create(createTiposActivoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.tiposActivoService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.tiposActivoService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTiposActivoDto: UpdateTiposActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.tiposActivoService.update(id, updateTiposActivoDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.tiposActivoService.remove(id, user);
    return { ok: true };
  }
}
