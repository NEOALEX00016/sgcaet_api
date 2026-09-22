import {
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateAsignacionBolsaTelecomDto {
  @IsOptional()
  @IsNumberString()
  cantidad?: string;

  @IsOptional()
  @IsString()
  @Length(2, 20)
  unidad?: string;

  @IsOptional()
  @IsString()
  @IsIn(['activa', 'consumida', 'cancelada', 'vencida'])
  estado?: string;
}
