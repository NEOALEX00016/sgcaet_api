import { PartialType } from '@nestjs/mapped-types';
import { CreateMarcasEmpresaDto } from './create-marcas-empresa.dto';

export class UpdateMarcasEmpresaDto extends PartialType(
  CreateMarcasEmpresaDto,
) {}
