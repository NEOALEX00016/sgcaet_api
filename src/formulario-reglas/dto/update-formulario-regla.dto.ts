import { PartialType } from '@nestjs/mapped-types';
import { CreateFormularioReglaDto } from './create-formulario-regla.dto';

export class UpdateFormularioReglaDto extends PartialType(
  CreateFormularioReglaDto,
) {}
