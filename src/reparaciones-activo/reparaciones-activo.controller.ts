import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ReparacionesActivoService } from './reparaciones-activo.service';
import { CreateReparacionActivoDto } from './dto/create-reparacion-activo.dto';
import { UpdateReparacionActivoDto } from './dto/update-reparacion-activo.dto';
import { ResolverReparacionActivoDto } from './dto/resolver-reparacion-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('reparaciones-activo')
@RequirePermission('reparaciones.gestionar')
export class ReparacionesActivoController {
  constructor(
    private readonly reparacionesActivoService: ReparacionesActivoService,
  ) {}

  @Post()
  create(
    @Body() createReparacionActivoDto: CreateReparacionActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.create(
      createReparacionActivoDto,
      user,
    );
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.reparacionesActivoService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reparacionesActivoService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReparacionActivoDto: UpdateReparacionActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.update(
      id,
      updateReparacionActivoDto,
      user,
    );
  }

  @Post(':id/comunicar-diagnostico')
  comunicarDiagnostico(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.comunicarDiagnostico(id, user);
  }

  @Post(':id/resolver')
  resolver(
    @Param('id') id: string,
    @Body() dto: ResolverReparacionActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.resolver(id, dto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.reparacionesActivoService.remove(id, user);
    return { ok: true };
  }
}
