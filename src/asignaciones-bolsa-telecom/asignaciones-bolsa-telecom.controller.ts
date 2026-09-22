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
import { AsignacionesBolsaTelecomService } from './asignaciones-bolsa-telecom.service';
import { CreateAsignacionBolsaTelecomDto } from './dto/create-asignacion-bolsa-telecom.dto';
import { UpdateAsignacionBolsaTelecomDto } from './dto/update-asignacion-bolsa-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

type EstadoAsignacionBolsa = 'activa' | 'consumida' | 'cancelada' | 'vencida';
type VigenciaAsignacionBolsa = 'vigente' | 'vencida' | 'inconsistente';

@Controller('asignaciones-bolsa-telecom')
export class AsignacionesBolsaTelecomController {
  constructor(
    private readonly asignacionesBolsaTelecomService: AsignacionesBolsaTelecomService,
  ) {}

  @RequirePermission('telecom.asignaciones-bolsa.crear')
  @Post()
  create(
    @Body() createAsignacionBolsaTelecomDto: CreateAsignacionBolsaTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionesBolsaTelecomService.create(
      createAsignacionBolsaTelecomDto,
      user,
    );
  }

  @RequirePermission('telecom.asignaciones-bolsa.ver')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lineaTelefonicaId') lineaTelefonicaId?: string,
    @Query('estado') estado?: EstadoAsignacionBolsa,
    @Query('vigencia') vigencia?: VigenciaAsignacionBolsa,
  ) {
    return this.asignacionesBolsaTelecomService.findAll(user, {
      lineaTelefonicaId: lineaTelefonicaId?.trim() || undefined,
      estado: estado?.trim() as EstadoAsignacionBolsa | undefined,
      vigencia: vigencia?.trim() as VigenciaAsignacionBolsa | undefined,
    });
  }

  @RequirePermission('telecom.asignaciones-bolsa.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.asignacionesBolsaTelecomService.findOne(id, user);
  }

  @RequirePermission('telecom.asignaciones-bolsa.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAsignacionBolsaTelecomDto: UpdateAsignacionBolsaTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.asignacionesBolsaTelecomService.update(
      id,
      updateAsignacionBolsaTelecomDto,
      user,
    );
  }

  @RequirePermission('telecom.asignaciones-bolsa.eliminar')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.asignacionesBolsaTelecomService.remove(id, user);
    return { ok: true };
  }
}
