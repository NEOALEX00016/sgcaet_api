import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PlanesComercialesTelecomService } from './planes-comerciales-telecom.service';
import { CreatePlanesComercialesTelecomDto } from './dto/create-planes-comerciales-telecom.dto';
import { UpdatePlanesComercialesTelecomDto } from './dto/update-planes-comerciales-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('planes-comerciales-telecom')
@RequirePermission('telecom.planes.gestionar')
export class PlanesComercialesTelecomController {
  constructor(private readonly planesComercialesTelecomService: PlanesComercialesTelecomService) {}

  @Post()
  create(@Body() dto: CreatePlanesComercialesTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.planesComercialesTelecomService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.planesComercialesTelecomService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planesComercialesTelecomService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanesComercialesTelecomDto, @CurrentUser() user: AuthenticatedUser) {
    return this.planesComercialesTelecomService.update(id, dto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planesComercialesTelecomService.remove(id, user);
  }
}
