import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { ReglasNegocioService } from './reglas-negocio.service';
import { CreateReglasNegocioDto } from './dto/create-reglas-negocio.dto';
import { UpdateReglasNegocioDto } from './dto/update-reglas-negocio.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { EvaluateReglaNegocioDto } from './dto/evaluate-regla-negocio.dto';
import { QueryEvaluacionesReglasDto } from './dto/query-evaluaciones-reglas.dto';

@Controller('reglas-negocio')
@RequirePermission('reglas-negocio.gestionar')
export class ReglasNegocioController {
  constructor(private readonly reglasNegocioService: ReglasNegocioService) {}

  @Post()
  create(@Body() dto: CreateReglasNegocioDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query('dominio') dominio?: string) {
    return this.reglasNegocioService.findAll(user, dominio);
  }

  @Post('evaluar')
  evaluate(@Body() dto: EvaluateReglaNegocioDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.evaluate(user, dto.dominio, dto.clave, dto.contexto, dto.evaluadaEn ? new Date(dto.evaluadaEn) : new Date(), { entidadTipo: dto.entidadTipo, entidadId: dto.entidadId, resultado: dto.resultado });
  }

  @Get('evaluaciones')
  findEvaluations(@Query() query: QueryEvaluacionesReglasDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.findEvaluations(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateReglasNegocioDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.reglasNegocioService.remove(id, user);
  }
}
