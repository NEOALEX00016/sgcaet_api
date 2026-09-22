import { PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateAuditoriaDetalleDto } from './create-auditoria-detalle.dto';

export class UpdateAuditoriaDetalleDto extends PartialType(
  CreateAuditoriaDetalleDto,
) {}
