import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { OperadorasService } from './operadoras.service';
import { CreateOperadoraDto } from './dto/create-operadora.dto';
import { UpdateOperadoraDto } from './dto/update-operadora.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('operadoras')
@RequirePermission('telecom.gestionar')
export class OperadorasController {
  constructor(private readonly operadorasService: OperadorasService) {}

  @Post()
  create(
    @Body() createOperadoraDto: CreateOperadoraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operadorasService.create(createOperadoraDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.operadorasService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.operadorasService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateOperadoraDto: UpdateOperadoraDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.operadorasService.update(id, updateOperadoraDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.operadorasService.destroy(id, user);
    return { ok: true };
  }
}
