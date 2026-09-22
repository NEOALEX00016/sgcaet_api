import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PoolsTelecomService } from './pools-telecom.service';
import { CreatePoolsTelecomDto } from './dto/create-pools-telecom.dto';
import { UpdatePoolsTelecomDto } from './dto/update-pools-telecom.dto';
import { CreateCapacidadPoolTelecomDto } from './dto/create-capacidad-pool-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('pools-telecom')
@RequirePermission('telecom.gestionar')
export class PoolsTelecomController {
  constructor(private readonly poolsTelecomService: PoolsTelecomService) {}

  @Post()
  create(@Body() dto: CreatePoolsTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.poolsTelecomService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsTelecomService.findOne(id, user);
  }

  @Get(':id/capacidades') capacidades(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.poolsTelecomService.getCapacidades(id, user); }
  @Post(':id/capacidades') addCapacidad(@Param('id') id: string, @Body() dto: CreateCapacidadPoolTelecomDto, @CurrentUser() user: AuthenticatedUser) { return this.poolsTelecomService.addCapacidad(id, dto, user); }
  @Patch(':poolId/capacidades/:id') updateCapacidad(@Param('poolId') poolId: string, @Param('id') id: string, @Body() dto: Partial<CreateCapacidadPoolTelecomDto>, @CurrentUser() user: AuthenticatedUser) { return this.poolsTelecomService.updateCapacidad(poolId, id, dto, user); }
  @Delete(':poolId/capacidades/:id') removeCapacidad(@Param('poolId') poolId: string, @Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.poolsTelecomService.removeCapacidad(poolId, id, user); }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePoolsTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsTelecomService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.poolsTelecomService.remove(id, user);
  }
}
