import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UsuarioRolesService } from './usuario-roles.service';
import { CreateUsuarioRoleDto } from './dto/create-usuario-role.dto';
import { UpdateUsuarioRoleDto } from './dto/update-usuario-role.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('usuario-roles')
@RequirePermission('seguridad.roles.gestionar')
export class UsuarioRolesController {
  constructor(private readonly usuarioRolesService: UsuarioRolesService) {}

  @Post()
  create(
    @Body() createUsuarioRoleDto: CreateUsuarioRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuarioRolesService.create(createUsuarioRoleDto, user);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.usuarioRolesService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usuarioRolesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUsuarioRoleDto: UpdateUsuarioRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usuarioRolesService.update(id, updateUsuarioRoleDto, user);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.usuarioRolesService.remove(id, user);
    return { ok: true };
  }
}
