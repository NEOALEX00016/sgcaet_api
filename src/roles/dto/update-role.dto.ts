import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  codigo?: string;

  @IsOptional()
  @IsString()
  @Length(2, 120)
  nombre?: string;

  @IsOptional()
  @IsString()
  @Length(2, 400)
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estaActivo?: boolean;
}
