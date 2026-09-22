import { PartialType } from '@nestjs/mapped-types';
import { CreateOperadoraDto } from './create-operadora.dto';

export class UpdateOperadoraDto extends PartialType(CreateOperadoraDto) {}
