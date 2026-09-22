import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CreateSolicitudDto } from './dto/create-solicitud.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { QuerySolicitudesDto } from './dto/query-solicitudes.dto';
import { UpdateEstadoSolicitudDto } from './dto/update-estado-solicitud.dto';
import { ConvertirASolicitudAsignacionDto } from './dto/convertir-a-asignacion.dto';
import { ConvertirASolicitudPrestamoDto } from './dto/convertir-a-prestamo.dto';
import { ConvertirASolicitudReparacionDto } from './dto/convertir-a-reparacion.dto';
import { CreateSolicitudMixtaDto } from './dto/create-solicitud-mixta.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}
  @RequirePermission('solicitudes.crear')
  @Post() create(
    @Body() dto: CreateSolicitudDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.solicitudesService.create(dto, user);
  }
  @RequirePermission('solicitudes.ver')
  @Get('mine') findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.solicitudesService.findMine(user);
  }

  @RequirePermission('solicitudes.crear')
  @Post('mixta') createMixta(@Body() dto: CreateSolicitudMixtaDto, @CurrentUser() user: AuthenticatedUser) {
    return this.solicitudesService.createMixta(dto, user);
  }

  @RequirePermission('solicitudes.ver')
  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QuerySolicitudesDto,
  ) {
    return this.solicitudesService.findAdmin(user, query);
  }

  @RequirePermission('solicitudes.ver')
  @Patch(':id/aprobar')
  aprobar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEstadoSolicitudDto,
  ) {
    return this.solicitudesService.aprobar(id, user, dto);
  }

  @RequirePermission('solicitudes.ver')
  @Patch(':id/rechazar')
  rechazar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEstadoSolicitudDto,
  ) {
    return this.solicitudesService.rechazar(id, user, dto);
  }

  @RequirePermission('solicitudes.ver')
  @Post(':id/convertir-asignacion')
  convertirAsignacion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConvertirASolicitudAsignacionDto,
  ) {
    return this.solicitudesService.convertirAAsignacion(id, user, dto);
  }

  @RequirePermission('solicitudes.ver')
  @Post(':id/convertir-prestamo')
  convertirPrestamo(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConvertirASolicitudPrestamoDto,
  ) {
    return this.solicitudesService.convertirAPrestamo(id, user, dto);
  }

  @RequirePermission('solicitudes.ver')
  @Post(':id/convertir-reparacion')
  convertirReparacion(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ConvertirASolicitudReparacionDto,
  ) {
    return this.solicitudesService.convertirAReparacion(id, user, dto);
  }
}
