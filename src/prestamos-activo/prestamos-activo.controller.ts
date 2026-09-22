import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PrestamosActivoService } from './prestamos-activo.service';
import { CreatePrestamoActivoDto } from './dto/create-prestamo-activo.dto';
import { UpdatePrestamoActivoDto } from './dto/update-prestamo-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('prestamos-activo')
@RequirePermission('prestamos.gestionar')
export class PrestamosActivoController {
  constructor(
    private readonly prestamosActivoService: PrestamosActivoService,
  ) {}

  @Post()
  create(
    @Body() createPrestamoActivoDto: CreatePrestamoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosActivoService.create(createPrestamoActivoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.prestamosActivoService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.prestamosActivoService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePrestamoActivoDto: UpdatePrestamoActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.prestamosActivoService.update(
      id,
      updatePrestamoActivoDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.prestamosActivoService.remove(id, user);
    return { ok: true };
  }
}
