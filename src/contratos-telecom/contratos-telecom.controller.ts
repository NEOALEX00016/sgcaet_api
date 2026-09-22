import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ContratosTelecomService } from './contratos-telecom.service';
import { CreateContratosTelecomDto } from './dto/create-contratos-telecom.dto';
import { UpdateContratosTelecomDto } from './dto/update-contratos-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('contratos-telecom')
@RequirePermission('telecom.gestionar')
export class ContratosTelecomController {
  constructor(private readonly contratosTelecomService: ContratosTelecomService) {}

  @Post()
  create(@Body() dto: CreateContratosTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.contratosTelecomService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosTelecomService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateContratosTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosTelecomService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.contratosTelecomService.remove(id, user);
  }
}
