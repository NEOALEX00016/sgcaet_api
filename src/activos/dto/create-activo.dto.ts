import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateActivoDto {
  @IsUUID()
  tipoActivoId: string;

  @IsOptional()
  @IsUUID()
  ubicacionActualId?: string;

  @IsString()
  @Length(2, 60)
  codigoActivo: string;

  @IsString()
  @Length(2, 120)
  nombre: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  marca?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  modelo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  serial?: string;

  @IsOptional()
  @IsString()
  @IsIn([
    'registrado',
    'disponible',
    'asignado',
    'en_uso',
    'en_reparacion',
    'devuelto',
    'perdido',
    'robado',
    'transferido',
    'dado_de_baja',
    'desechado',
  ])
  estado?: string;

  @IsOptional()
  @IsDateString()
  fechaCompra?: string;

  @IsOptional()
  @IsNumberString()
  costoCompra?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;

  @IsOptional() @IsDateString() fechaDescargo?: string;
}
