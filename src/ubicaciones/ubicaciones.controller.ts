import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UbicacionesService } from './ubicaciones.service';
import { CreateUbicacioneDto } from './dto/create-ubicacione.dto';
import { UpdateUbicacioneDto } from './dto/update-ubicacione.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('ubicaciones')
@RequirePermission('estructura.gestionar')
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Post()
  create(
    @Body() createUbicacioneDto: CreateUbicacioneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ubicacionesService.create(createUbicacioneDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ubicacionesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ubicacionesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUbicacioneDto: UpdateUbicacioneDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ubicacionesService.update(id, updateUbicacioneDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.ubicacionesService.remove(id, user);
    return { ok: true };
  }
}
