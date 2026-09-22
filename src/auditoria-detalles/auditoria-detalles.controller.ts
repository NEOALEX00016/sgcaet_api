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
import { AuditoriaDetallesService } from './auditoria-detalles.service';
import { CreateAuditoriaDetalleDto } from './dto/create-auditoria-detalle.dto';
import { UpdateAuditoriaDetalleDto } from './dto/update-auditoria-detalle.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('auditoria-detalles')
@RequirePermission('auditorias.detalles.gestionar')
export class AuditoriaDetallesController {
  constructor(
    private readonly auditoriaDetallesService: AuditoriaDetallesService,
  ) {}

  @Post()
  create(
    @Body() createAuditoriaDetalleDto: CreateAuditoriaDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriaDetallesService.create(
      createAuditoriaDetalleDto,
      user,
    );
  }

  @Get()
  findAll(
    @Query('auditoriaId') auditoriaId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriaDetallesService.findAll(user, auditoriaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.auditoriaDetallesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuditoriaDetalleDto: UpdateAuditoriaDetalleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriaDetallesService.update(
      id,
      updateAuditoriaDetalleDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.auditoriaDetallesService.remove(id, user);
    return { ok: true };
  }
}
