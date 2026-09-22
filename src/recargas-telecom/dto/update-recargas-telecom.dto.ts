import { PartialType } from '@nestjs/swagger';
import { CreateRecargasTelecomDto } from './create-recargas-telecom.dto';

export class UpdateRecargasTelecomDto extends PartialType(CreateRecargasTelecomDto) {}
