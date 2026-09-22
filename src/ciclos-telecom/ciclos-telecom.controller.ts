import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CiclosTelecomService } from './ciclos-telecom.service';
import { CreateCiclosTelecomDto } from './dto/create-ciclos-telecom.dto';
import { UpdateCiclosTelecomDto } from './dto/update-ciclos-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('ciclos-telecom')
@RequirePermission('telecom.gestionar')
export class CiclosTelecomController {
  constructor(private readonly ciclosTelecomService: CiclosTelecomService) {}

  @Post()
  create(@Body() dto: CreateCiclosTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ciclosTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.ciclosTelecomService.findAll(user);
  }

  @Post(':id/cerrar') close(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.ciclosTelecomService.close(id, user); }
}
