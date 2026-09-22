import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { PersonasService } from './personas.service';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { ImportPersonasManualDto } from './dto/import-personas-manual.dto';
import { ImportPersonasApiDto } from './dto/import-personas-api.dto';

@Controller('personas')
@RequirePermission('personas.gestionar')
export class PersonasController {
  constructor(private readonly personasService: PersonasService) {}

  @Post()
  create(
    @Body() createPersonaDto: CreatePersonaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personasService.create(createPersonaDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.personasService.findAll(user);
  }

  @Get('regularizacion/pendientes')
  regularizacionPendientes(@CurrentUser() user: AuthenticatedUser) {
    return this.personasService.getRegularizacionPendientes(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.personasService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePersonaDto: UpdatePersonaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personasService.update(id, updatePersonaDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.personasService.remove(id, user);
    return { ok: true };
  }

  @Post('import/manual')
  importManual(
    @Body() dto: ImportPersonasManualDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personasService.importFromManual(dto, user);
  }

  @Post('import/api')
  importApi(
    @Body() dto: ImportPersonasApiDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.personasService.importFromApi(dto, user);
  }
}
