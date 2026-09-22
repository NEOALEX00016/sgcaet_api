import { PartialType } from '@nestjs/swagger';
import { CreateProgramacionesMantenimientoDto } from './create-programaciones-mantenimiento.dto';

export class UpdateProgramacionesMantenimientoDto extends PartialType(
  CreateProgramacionesMantenimientoDto,
) {}
