import { PartialType } from '@nestjs/swagger';
import { CreatePoolsTelecomDto } from './create-pools-telecom.dto';

export class UpdatePoolsTelecomDto extends PartialType(CreatePoolsTelecomDto) {}
