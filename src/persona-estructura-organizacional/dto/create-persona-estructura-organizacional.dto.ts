import {
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
export class CreatePersonaEstructuraOrganizacionalDto {
  @IsUUID() personaId: string;
  @IsUUID() estructuraNodoId: string;
  @IsOptional() @IsString() rolEnNodo?: string;
  @IsOptional() @IsBoolean() esPrincipal?: boolean;
  @IsOptional() @IsDateString() iniciaEn?: string;
  @IsOptional() @IsDateString() finalizaEn?: string;
}
