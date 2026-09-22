import { PartialType } from '@nestjs/swagger';
import { CreatePlanesComercialesTelecomDto } from './create-planes-comerciales-telecom.dto';

export class UpdatePlanesComercialesTelecomDto extends PartialType(CreatePlanesComercialesTelecomDto) {}
