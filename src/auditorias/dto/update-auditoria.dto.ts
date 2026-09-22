import { PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateAuditoriaDto } from './create-auditoria.dto';

export class UpdateAuditoriaDto extends PartialType(CreateAuditoriaDto) {}
