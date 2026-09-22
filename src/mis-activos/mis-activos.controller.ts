import { Controller, Get } from '@nestjs/common';
import { MisActivosService } from './mis-activos.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@Controller('me/activos')
export class MisActivosController {
  constructor(private readonly misActivosService: MisActivosService) {}

  @RequirePermission('mis-activos.ver')
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.misActivosService.findMine(user);
  }

  @RequirePermission('mis-activos.ver')
  @Get('lineas')
  findMyLines(@CurrentUser() user: AuthenticatedUser) {
    return this.misActivosService.findMyLines(user);
  }
}
