import { PartialType } from '@nestjs/swagger';
import { CreateTiposAsignacionDto } from './create-tipos-asignacion.dto';

export class UpdateTiposAsignacionDto extends PartialType(CreateTiposAsignacionDto) {}
