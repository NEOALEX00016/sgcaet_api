import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateEstadoSolicitudDto {
  @IsOptional()
  @IsString()
  @Length(2, 500)
  motivoRevision?: string;
}
