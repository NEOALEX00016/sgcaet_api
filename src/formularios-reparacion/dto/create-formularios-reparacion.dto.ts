import { OmitType } from '@nestjs/swagger';
import { CreateFormularioRespuestaDto } from '../../formulario-respuestas/dto/create-formulario-respuesta.dto';

export class CompletarFormularioReparacionDto extends OmitType(
  CreateFormularioRespuestaDto,
  [
    'formularioVersionId',
    'entidadRelacionada',
    'entidadRelacionadaId',
    'respondidoPor',
    'respondidoEn',
    'firmaUrl',
  ] as const,
) {}
