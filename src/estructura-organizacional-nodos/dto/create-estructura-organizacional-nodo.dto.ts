import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
export class CreateEstructuraOrganizacionalNodoDto {
  @IsOptional() @IsUUID() nodoPadreId?: string;
  @IsString() @Length(2, 30) tipoNodo: string;
  @IsOptional() @IsUUID() tipoNodoId?: string;
  @IsString() @Length(1, 60) codigo: string;
  @IsString() @Length(1, 160) nombre: string;
  @IsOptional() @IsString() descripcion?: string;
  @IsOptional() @IsBoolean() estaActivo?: boolean;
}
