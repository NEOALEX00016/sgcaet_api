import { PartialType } from '@nestjs/mapped-types';
import { CreateDireccionesEmpresaDto } from './create-direcciones-empresa.dto';

export class UpdateDireccionesEmpresaDto extends PartialType(
  CreateDireccionesEmpresaDto,
) {}
