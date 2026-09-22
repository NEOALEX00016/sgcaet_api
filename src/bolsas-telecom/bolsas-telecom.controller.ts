import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { BolsasTelecomService } from './bolsas-telecom.service';
import { CreateBolsaTelecomDto } from './dto/create-bolsa-telecom.dto';
import { UpdateBolsaTelecomDto } from './dto/update-bolsa-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('bolsas-telecom')
export class BolsasTelecomController {
  constructor(private readonly bolsasTelecomService: BolsasTelecomService) {}

  @RequirePermission('telecom.bolsas.crear')
  @Post()
  create(
    @Body() createBolsaTelecomDto: CreateBolsaTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bolsasTelecomService.create(createBolsaTelecomDto, user);
  }

  @RequirePermission('telecom.bolsas.ver')
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.bolsasTelecomService.findAll(user);
  }

  @RequirePermission('telecom.bolsas.ver')
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bolsasTelecomService.findOne(id, user);
  }

  @RequirePermission('telecom.bolsas.editar')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBolsaTelecomDto: UpdateBolsaTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bolsasTelecomService.update(id, updateBolsaTelecomDto, user);
  }

  @RequirePermission('telecom.bolsas.eliminar')
  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.bolsasTelecomService.remove(id, user);
    return { ok: true };
  }
}
