import { PartialType } from '@nestjs/mapped-types';
import { CreateIntegracionMesaAyudaDto } from './create-integracion-mesa-ayuda.dto';

export class UpdateIntegracionMesaAyudaDto extends PartialType(
  CreateIntegracionMesaAyudaDto,
) {}
