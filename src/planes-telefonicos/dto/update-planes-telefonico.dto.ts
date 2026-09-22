import { PartialType } from '@nestjs/mapped-types';
import { CreatePlanesTelefonicoDto } from './create-planes-telefonico.dto';

export class UpdatePlanesTelefonicoDto extends PartialType(
  CreatePlanesTelefonicoDto,
) {}
