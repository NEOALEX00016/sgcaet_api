import { PartialType } from '@nestjs/swagger';
import { CreatePoliticasFormularioAsignacionDto } from './create-politicas-formulario-asignacion.dto';

export class UpdatePoliticasFormularioAsignacionDto extends PartialType(CreatePoliticasFormularioAsignacionDto) {}
