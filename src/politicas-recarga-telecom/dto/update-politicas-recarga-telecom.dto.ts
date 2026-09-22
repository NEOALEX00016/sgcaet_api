import { PartialType } from '@nestjs/swagger';
import { CreatePoliticasRecargaTelecomDto } from './create-politicas-recarga-telecom.dto';

export class UpdatePoliticasRecargaTelecomDto extends PartialType(CreatePoliticasRecargaTelecomDto) {}
