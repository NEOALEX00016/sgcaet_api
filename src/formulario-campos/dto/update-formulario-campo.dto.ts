import { PartialType } from '@nestjs/mapped-types';
import { CreateFormularioCampoDto } from './create-formulario-campo.dto';

export class UpdateFormularioCampoDto extends PartialType(
  CreateFormularioCampoDto,
) {}
