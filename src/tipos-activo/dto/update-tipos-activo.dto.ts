import { PartialType } from '@nestjs/mapped-types';
import { CreateTiposActivoDto } from './create-tipos-activo.dto';

export class UpdateTiposActivoDto extends PartialType(CreateTiposActivoDto) {}
