import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdatePrestamoActivoDto {
  @IsOptional()
  @IsDateString()
  fechaPrevistaRetorno?: string;

  @IsOptional()
  @IsDateString()
  fechaRetornoReal?: string;

  @IsOptional()
  @IsString()
  @IsIn(['prestado', 'devuelto', 'vencido', 'cancelado'])
  estado?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  observaciones?: string;
}
