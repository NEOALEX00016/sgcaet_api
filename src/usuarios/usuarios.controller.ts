import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { SetPlatformOwnerDto } from './dto/set-platform-owner.dto';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('usuarios')
@RequirePermission('seguridad.usuarios.gestionar')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Post()
  create(
    @Body() createUsuarioDto: CreateUsuarioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuariosService.create(createUsuarioDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usuariosService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usuariosService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUsuarioDto: UpdateUsuarioDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuariosService.update(id, updateUsuarioDto, user);
  }

  @Patch(':id/platform-owner')
  @RequirePermission('plataforma.empresas.gestionar')
  setPlatformOwner(
    @Param('id') id: string,
    @Body() dto: SetPlatformOwnerDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuariosService.setPlatformOwner(id, dto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.usuariosService.remove(id, user);
    return { ok: true };
  }
}
