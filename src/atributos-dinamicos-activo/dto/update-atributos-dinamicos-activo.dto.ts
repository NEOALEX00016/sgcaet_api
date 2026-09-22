import { PartialType } from '@nestjs/mapped-types';
import { CreateAtributosDinamicosActivoDto } from './create-atributos-dinamicos-activo.dto';

export class UpdateAtributosDinamicosActivoDto extends PartialType(
  CreateAtributosDinamicosActivoDto,
) {}
