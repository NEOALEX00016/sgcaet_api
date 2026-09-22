import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { RecargasTelecomService } from './recargas-telecom.service';
import { CreateRecargasTelecomDto } from './dto/create-recargas-telecom.dto';
import { UpdateRecargasTelecomDto } from './dto/update-recargas-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('recargas-telecom')
@RequirePermission('telecom.gestionar')
export class RecargasTelecomController {
  constructor(private readonly recargasTelecomService: RecargasTelecomService) {}

  @Post()
  create(@Body() dto: CreateRecargasTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.recargasTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.recargasTelecomService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.recargasTelecomService.findOne(id, user);
  }

  @Post(':id/aprobar') approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.recargasTelecomService.approve(id, user); }
  @Post(':id/rechazar') reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.recargasTelecomService.reject(id, user); }
  @Post(':id/aplicar') apply(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) { return this.recargasTelecomService.apply(id, user); }

}
