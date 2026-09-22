import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';
import { ImportPersonaItemDto } from './import-persona-item.dto';

export class ImportPersonasManualDto {
  @IsOptional()
  @IsUUID()
  fuenteEmpleadosId?: string;

  @IsString()
  @Length(1, 120)
  nombreCarga: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ImportPersonaItemDto)
  personas: ImportPersonaItemDto[];
}
