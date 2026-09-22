import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReparacionesActivoService } from './reparaciones-activo.service';
import { CreateReparacionActivoDto } from './dto/create-reparacion-activo.dto';
import { UpdateReparacionActivoDto } from './dto/update-reparacion-activo.dto';
import { ResolverReparacionActivoDto } from './dto/resolver-reparacion-activo.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import {
  RequirePermission,
  RequireBodyFieldPermissions,
  RequirePermissions,
} from '../auth/decorators/require-permission.decorator';
import { ReservarRepuestoDto } from './dto/reservar-repuesto.dto';
import { LiberarRepuestoDto } from './dto/liberar-repuesto.dto';
import { CompletarFormularioReparacionDto } from '../formularios-reparacion/dto/create-formularios-reparacion.dto';

@Controller('reparaciones-activo')
export class ReparacionesActivoController {
  constructor(
    private readonly reparacionesActivoService: ReparacionesActivoService,
  ) {}

  @Post()
  @RequirePermission('reparaciones.crear')
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
  @RequirePermission('reparaciones.ver')
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.reparacionesActivoService.findAll(user);
  }

  @Get('activo/:activoId/linea-tiempo')
  @RequirePermission('reparaciones.ver')
  findAssetTimeline(
    @Param('activoId', ParseUUIDPipe) activoId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.findAssetTimeline(activoId, user);
  }

  @Get('reportes/ordenes')
  @RequirePermission('reparaciones.reportes.ver')
  findOrdersReport(@CurrentUser() user: AuthenticatedUser) {
    return this.reparacionesActivoService.findOrdersReport(user);
  }

  @Get(':id')
  @RequirePermission('reparaciones.ver')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.findOne(id, user);
  }

  @Patch(':id')
  @RequireBodyFieldPermissions({
    diagnostico: ['reparaciones.diagnosticar', 'reparaciones.editar'],
    proveedorTecnico: ['reparaciones.diagnosticar', 'reparaciones.editar'],
    observaciones: ['reparaciones.diagnosticar', 'reparaciones.editar'],
    fechaSalida: ['reparaciones.diagnosticar', 'reparaciones.editar'],
    resultado: ['reparaciones.diagnosticar', 'reparaciones.editar'],
    estado: ['reparaciones.estado'],
    costo: ['reparaciones.costos.gestionar'],
    moneda: ['reparaciones.costos.gestionar'],
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
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
  @RequirePermission('reparaciones.comunicar')
  comunicarDiagnostico(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.comunicarDiagnostico(id, user);
  }

  @Post(':id/resolver')
  @RequirePermission('reparaciones.resolver')
  resolver(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverReparacionActivoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.resolver(id, dto, user);
  }

  @Post(':id/preparar-formulario/:etapa')
  @RequirePermission('reparaciones.formularios.gestionar')
  prepararFormulario(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('etapa') etapa: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.prepararFormulario(id, etapa, user);
  }

  @Get(':id/formularios')
  @RequirePermission('reparaciones.formularios.ver')
  findFormularios(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.findFormularios(id, user);
  }

  @Post(':id/formularios/:instanciaId/completar')
  @RequirePermission('reparaciones.formularios.responder')
  completarFormulario(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('instanciaId', ParseUUIDPipe) instanciaId: string,
    @Body() dto: CompletarFormularioReparacionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.completarFormulario(
      id,
      instanciaId,
      dto,
      user,
    );
  }

  @Post(':id/reservar-repuesto')
  @RequirePermissions('repuestos.existencias.gestionar', 'reparaciones.editar')
  reservarRepuesto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReservarRepuestoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.reservarRepuesto(id, dto, user);
  }

  @Post(':id/liberar-repuesto')
  @RequirePermissions('repuestos.existencias.gestionar', 'reparaciones.editar')
  liberarRepuesto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: LiberarRepuestoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.liberarRepuesto(id, dto, user);
  }

  @Get(':id/repuestos')
  @RequirePermission('repuestos.ver')
  findRepuestos(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reparacionesActivoService.findRepuestos(id, user);
  }

  @Delete(':id')
  @RequirePermission('reparaciones.cancelar')
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.reparacionesActivoService.remove(id, user);
    return { ok: true };
  }
}
