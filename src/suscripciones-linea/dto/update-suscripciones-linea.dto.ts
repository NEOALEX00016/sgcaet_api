import { PartialType } from '@nestjs/mapped-types';
import { CreateSuscripcionesLineaDto } from './create-suscripciones-linea.dto';

export class UpdateSuscripcionesLineaDto extends PartialType(
  CreateSuscripcionesLineaDto,
) {}
