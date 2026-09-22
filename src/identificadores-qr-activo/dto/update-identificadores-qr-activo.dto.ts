import { PartialType } from '@nestjs/mapped-types';
import { CreateIdentificadoresQrActivoDto } from './create-identificadores-qr-activo.dto';

export class UpdateIdentificadoresQrActivoDto extends PartialType(
  CreateIdentificadoresQrActivoDto,
) {}
