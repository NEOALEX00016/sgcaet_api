import { PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateFormularioVersioneDto } from './create-formulario-versione.dto';

export class UpdateFormularioVersioneDto extends PartialType(
  CreateFormularioVersioneDto,
) {}
