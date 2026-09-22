import { PartialType } from '@nestjs/mapped-types';
import { IsUUID } from 'class-validator';
import { CreateFormularioDto } from './create-formulario.dto';

export class UpdateFormularioDto extends PartialType(CreateFormularioDto) {}
