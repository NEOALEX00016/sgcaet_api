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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AuditoriasService } from './auditorias.service';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';

@Controller('auditorias')
@RequirePermission('auditorias.ejecutar')
export class AuditoriasController {
  constructor(private readonly auditoriasService: AuditoriasService) {}

  @Post()
  create(
    @Body() createAuditoriaDto: CreateAuditoriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriasService.create(createAuditoriaDto, user);
  }

  @Get()
  findAll(
    @Query('estado') estado: string,
    @Query('dominio') dominio: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriasService.findAll(user, estado, dominio);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.auditoriasService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAuditoriaDto: UpdateAuditoriaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.auditoriasService.update(id, updateAuditoriaDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.auditoriasService.remove(id, user);
    return { ok: true };
  }
}
