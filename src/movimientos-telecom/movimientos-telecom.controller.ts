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
import { MovimientosTelecomService } from './movimientos-telecom.service';
import { CreateMovimientosTelecomDto } from './dto/create-movimientos-telecom.dto';
import { UpdateMovimientosTelecomDto } from './dto/update-movimientos-telecom.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

type TipoMovimientoTelecom =
  | 'recarga'
  | 'pago_factura'
  | 'paquete_datos'
  | 'minutos_credito'
  | 'sms_credito'
  | 'consumo'
  | 'ajuste'
  | 'devolucion'
  | 'reverso'
  | 'vencimiento';

@Controller('movimientos-telecom')
@RequirePermission('telecom.gestionar')
export class MovimientosTelecomController {
  constructor(
    private readonly movimientosTelecomService: MovimientosTelecomService,
  ) {}

  @Post()
  create(
    @Body() createMovimientosTelecomDto: CreateMovimientosTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.movimientosTelecomService.create(
      createMovimientosTelecomDto,
      user,
    );
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('lineaTelefonicaId') lineaTelefonicaId?: string,
    @Query('bolsaTelecomId') bolsaTelecomId?: string,
    @Query('tipoMovimiento') tipoMovimiento?: TipoMovimientoTelecom,
    @Query('claveIdempotencia') claveIdempotencia?: string,
    @Query('referenciaExterna') referenciaExterna?: string,
    @Query('ocurridoDesde') ocurridoDesde?: string,
    @Query('ocurridoHasta') ocurridoHasta?: string,
  ) {
    return this.movimientosTelecomService.findAll(user, {
      lineaTelefonicaId: lineaTelefonicaId?.trim() || undefined,
      bolsaTelecomId: bolsaTelecomId?.trim() || undefined,
      tipoMovimiento: tipoMovimiento?.trim() as TipoMovimientoTelecom | undefined,
      claveIdempotencia: claveIdempotencia?.trim() || undefined,
      referenciaExterna: referenciaExterna?.trim() || undefined,
      ocurridoDesde: ocurridoDesde?.trim() || undefined,
      ocurridoHasta: ocurridoHasta?.trim() || undefined,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.movimientosTelecomService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMovimientosTelecomDto: UpdateMovimientosTelecomDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.movimientosTelecomService.update(
      id,
      updateMovimientosTelecomDto,
      user,
    );
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.movimientosTelecomService.remove(id, user);
    return { ok: true };
  }
}
