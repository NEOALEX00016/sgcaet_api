import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateDocumentDto {
  @IsOptional()
  @IsString()
  @Length(2, 50)
  entidadRelacionada?: string;

  @IsOptional()
  @IsUUID()
  entidadRelacionadaId?: string;
}
