import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PoliticasRecargaTelecomService } from './politicas-recarga-telecom.service';
import { CreatePoliticasRecargaTelecomDto } from './dto/create-politicas-recarga-telecom.dto';
import { UpdatePoliticasRecargaTelecomDto } from './dto/update-politicas-recarga-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('politicas-recarga-telecom')
@RequirePermission('telecom.gestionar')
export class PoliticasRecargaTelecomController {
  constructor(private readonly politicasRecargaTelecomService: PoliticasRecargaTelecomService) {}

  @Post()
  create(@Body() dto: CreatePoliticasRecargaTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasRecargaTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.politicasRecargaTelecomService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasRecargaTelecomService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePoliticasRecargaTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasRecargaTelecomService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.politicasRecargaTelecomService.remove(id, user);
  }
}
