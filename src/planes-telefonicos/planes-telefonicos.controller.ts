import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PlanesTelefonicosService } from './planes-telefonicos.service';
import { CreatePlanesTelefonicoDto } from './dto/create-planes-telefonico.dto';
import { UpdatePlanesTelefonicoDto } from './dto/update-planes-telefonico.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('planes-telefonicos')
@RequirePermission('telecom.catalogos.gestionar')
export class PlanesTelefonicosController {
  constructor(
    private readonly planesTelefonicosService: PlanesTelefonicosService,
  ) {}

  @Post()
  create(
    @Body() createPlanesTelefonicoDto: CreatePlanesTelefonicoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planesTelefonicosService.create(
      createPlanesTelefonicoDto,
      user,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('operadoraId') operadoraId?: string,
  ) {
    return this.planesTelefonicosService.findAll(user, operadoraId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.planesTelefonicosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePlanesTelefonicoDto: UpdatePlanesTelefonicoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.planesTelefonicosService.update(
      id,
      updatePlanesTelefonicoDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.planesTelefonicosService.remove(id, user);
    return { ok: true };
  }
}
