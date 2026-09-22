import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

class FormularioRespuestaDetalleDto {
  @IsString()
  @Length(1, 80)
  campoClave: string;

  @IsOptional()
  @IsString()
  valorTexto?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  valorNumero?: number;

  @IsOptional()
  @IsBoolean()
  valorBooleano?: boolean;

  @IsOptional()
  @IsDateString()
  valorFecha?: string;

  @IsOptional()
  @IsObject()
  valorJson?: Record<string, unknown>;
}

export class CreateFormularioRespuestaDto {
  @IsUUID()
  formularioVersionId: string;

  @IsString()
  @Length(2, 50)
  entidadRelacionada: string;

  @IsUUID()
  entidadRelacionadaId: string;

  @IsOptional()
  @IsUUID()
  respondidoPor?: string;

  @IsOptional()
  @IsDateString()
  respondidoEn?: string;

  @IsOptional()
  @IsString()
  @Length(3, 1000)
  firmaUrl?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormularioRespuestaDetalleDto)
  detalles?: FormularioRespuestaDetalleDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  evidenciaIds?: string[];
}

export { FormularioRespuestaDetalleDto };
