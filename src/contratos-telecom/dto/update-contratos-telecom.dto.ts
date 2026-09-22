import { PartialType } from '@nestjs/swagger';
import { CreateContratosTelecomDto } from './create-contratos-telecom.dto';

export class UpdateContratosTelecomDto extends PartialType(CreateContratosTelecomDto) {}
