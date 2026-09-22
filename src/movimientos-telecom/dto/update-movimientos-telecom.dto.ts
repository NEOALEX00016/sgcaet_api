import { PartialType } from '@nestjs/mapped-types';
import { CreateMovimientosTelecomDto } from './create-movimientos-telecom.dto';

export class UpdateMovimientosTelecomDto extends PartialType(
  CreateMovimientosTelecomDto,
) {}
