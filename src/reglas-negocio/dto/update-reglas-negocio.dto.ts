import { PartialType } from '@nestjs/swagger';
import { CreateReglasNegocioDto } from './create-reglas-negocio.dto';

export class UpdateReglasNegocioDto extends PartialType(CreateReglasNegocioDto) {}
