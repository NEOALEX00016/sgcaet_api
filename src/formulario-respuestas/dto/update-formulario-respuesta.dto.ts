import { PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateFormularioRespuestaDto } from './create-formulario-respuesta.dto';

export class UpdateFormularioRespuestaDto extends PartialType(
  CreateFormularioRespuestaDto,
) {}
