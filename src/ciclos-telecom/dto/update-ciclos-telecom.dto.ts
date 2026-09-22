import { PartialType } from '@nestjs/swagger';
import { CreateCiclosTelecomDto } from './create-ciclos-telecom.dto';

export class UpdateCiclosTelecomDto extends PartialType(CreateCiclosTelecomDto) {}
