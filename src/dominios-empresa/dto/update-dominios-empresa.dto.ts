import { PartialType } from '@nestjs/mapped-types';
import { CreateDominiosEmpresaDto } from './create-dominios-empresa.dto';

export class UpdateDominiosEmpresaDto extends PartialType(
  CreateDominiosEmpresaDto,
) {}
