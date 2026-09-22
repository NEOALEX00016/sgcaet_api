import { PartialType } from '@nestjs/swagger';
import { CreatePoliticasFormularioTallerDto } from './create-politicas-formulario-taller.dto';

export class UpdatePoliticasFormularioTallerDto extends PartialType(
  CreatePoliticasFormularioTallerDto,
) {}
