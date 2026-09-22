import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { LineasTelefonicasService } from './lineas-telefonicas.service';
import { CreateLineaTelefonicaDto } from './dto/create-linea-telefonica.dto';
import { UpdateLineaTelefonicaDto } from './dto/update-linea-telefonica.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

type EstadoLineaTelefonica =
  | 'registrada'
  | 'activa'
  | 'inactiva'
  | 'suspendida'
  | 'cancelada';

class CambiarLineaAsignadaDto {
  asignacionId: string;
  lineaAnteriorId: string;
  lineaNuevaId: string;
}

@Controller('lineas-telefonicas')
@RequirePermission('telecom.gestionar')
export class LineasTelefonicasController {
  constructor(
    private readonly lineasTelefonicasService: LineasTelefonicasService,
  ) {}

  @Post()
  create(
    @Body() createLineaTelefonicaDto: CreateLineaTelefonicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lineasTelefonicasService.create(createLineaTelefonicaDto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('estado') estado?: EstadoLineaTelefonica,
    @Query('estaActiva') estaActiva?: 'true' | 'false',
    @Query('search') search?: string,
  ) {
    const normalizedEstado = estado?.trim();
    const normalizedSearch = search?.trim();
    return this.lineasTelefonicasService.findAll(user, {
      estado: normalizedEstado || undefined,
      estaActiva:
        estaActiva === 'true'
          ? true
          : estaActiva === 'false'
            ? false
            : undefined,
      search: normalizedSearch || undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.lineasTelefonicasService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLineaTelefonicaDto: UpdateLineaTelefonicaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lineasTelefonicasService.update(
      id,
      updateLineaTelefonicaDto,
      user,
    );
  }

  @Post('reemplazo')
  cambiarLineaAsignada(
    @Body() body: CambiarLineaAsignadaDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.lineasTelefonicasService.cambiarLineaAsignada(
      user,
      body.asignacionId,
      body.lineaAnteriorId,
      body.lineaNuevaId,
    );
  }

  @Get('trazabilidad/persona-linea')
  getPersonaLineaTrace(
    @CurrentUser() user: AuthenticatedUser,
    @Query('personaId') personaId?: string,
    @Query('lineaTelefonicaId') lineaTelefonicaId?: string,
    @Query('soloActivas') soloActivas?: 'true' | 'false',
  ) {
    return this.lineasTelefonicasService.getPersonaLineaTrace(user, {
      personaId: personaId?.trim() || undefined,
      lineaTelefonicaId: lineaTelefonicaId?.trim() || undefined,
      soloActivas:
        soloActivas === 'false'
          ? false
          : true,
    });
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.lineasTelefonicasService.remove(id, user);
    return { ok: true };
  }
}
