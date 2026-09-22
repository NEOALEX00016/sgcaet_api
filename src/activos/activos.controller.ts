import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ActivosService } from './activos.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('activos')
@RequirePermission('activos.ver')
export class ActivosController {
  constructor(private readonly activosService: ActivosService) {}

  @Post()
  create(
    @Body() createActivoDto: CreateActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.create(createActivoDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.activosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.activosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateActivoDto: UpdateActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.activosService.update(id, updateActivoDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.activosService.remove(id, user);
    return { ok: true };
  }
}
