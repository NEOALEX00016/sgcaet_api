import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { IntegracionesMesaAyudaService } from './integraciones-mesa-ayuda.service';
import { CreateIntegracionMesaAyudaDto } from './dto/create-integracion-mesa-ayuda.dto';
import { UpdateIntegracionMesaAyudaDto } from './dto/update-integracion-mesa-ayuda.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('integraciones-mesa-ayuda')
@RequirePermission('integraciones.gestionar')
export class IntegracionesMesaAyudaController {
  constructor(private readonly service: IntegracionesMesaAyudaService) {}

  @Post()
  create(
    @Body() dto: CreateIntegracionMesaAyudaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findAll(user.empresaId);
  }

  @Get('eventos')
  findEvents(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findEvents(user.empresaId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user.empresaId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIntegracionMesaAyudaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(id, dto, user.empresaId);
  }

  @Post(':id/probar')
  probar(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.probarIntegracion(id, user);
  }

  @Post('eventos/:id/retry')
  retryEvento(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.retryEventById(id, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.remove(id, user.empresaId);
    return { ok: true };
  }
}
