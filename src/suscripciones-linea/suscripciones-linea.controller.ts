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
import { SuscripcionesLineaService } from './suscripciones-linea.service';
import { CreateSuscripcionesLineaDto } from './dto/create-suscripciones-linea.dto';
import { UpdateSuscripcionesLineaDto } from './dto/update-suscripciones-linea.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

type EstadoSuscripcion = 'activa' | 'vencida' | 'cancelada' | 'suspendida';
type VigenciaSuscripcion = 'vigente' | 'vencida' | 'inconsistente';

@Controller('suscripciones-linea')
@RequirePermission('telecom.catalogos.gestionar')
export class SuscripcionesLineaController {
  constructor(
    private readonly suscripcionesLineaService: SuscripcionesLineaService,
  ) {}

  @Post()
  create(
    @Body() createSuscripcionesLineaDto: CreateSuscripcionesLineaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suscripcionesLineaService.create(
      createSuscripcionesLineaDto,
      user,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lineaTelefonicaId') lineaTelefonicaId?: string,
    @Query('estado') estado?: EstadoSuscripcion,
    @Query('vigencia') vigencia?: VigenciaSuscripcion,
  ) {
    return this.suscripcionesLineaService.findAll(user, {
      lineaTelefonicaId: lineaTelefonicaId?.trim() || undefined,
      estado: estado?.trim() as EstadoSuscripcion | undefined,
      vigencia: vigencia?.trim() as VigenciaSuscripcion | undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.suscripcionesLineaService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSuscripcionesLineaDto: UpdateSuscripcionesLineaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suscripcionesLineaService.update(
      id,
      updateSuscripcionesLineaDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.suscripcionesLineaService.remove(id, user);
    return { ok: true };
  }
}
