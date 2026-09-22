import { PartialType } from '@nestjs/swagger';
import { CreatePiezasRepuestoDto } from './create-piezas-repuesto.dto';

export class UpdatePiezasRepuestoDto extends PartialType(CreatePiezasRepuestoDto) {}
