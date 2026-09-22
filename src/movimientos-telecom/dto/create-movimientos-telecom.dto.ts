import {
  IsDateString,
  IsIn,
  IsNumberString,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateMovimientosTelecomDto {
  @IsOptional()
  @IsUUID()
  lineaTelefonicaId?: string;

  @IsOptional()
  @IsUUID()
  bolsaTelecomId?: string;

  @IsString()
  @IsIn([
    'recarga',
    'pago_factura',
    'paquete_datos',
    'minutos_credito',
    'sms_credito',
    'consumo',
    'ajuste',
    'devolucion',
    'reverso',
    'vencimiento',
  ])
  tipoMovimiento: string;

  @IsNumberString()
  cantidad: string;

  @IsString()
  @Length(1, 20)
  unidad: string;

  @IsOptional()
  @IsNumberString()
  costo?: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  moneda?: string;

  @IsOptional()
  @IsString()
  @Length(4, 120)
  claveIdempotencia?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  referenciaExterna?: string;

  @IsOptional()
  @IsString()
  @Length(2, 2000)
  descripcion?: string;

  @IsOptional()
  @IsDateString()
  ocurridoEn?: string;
}
