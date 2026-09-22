import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class SetPlatformOwnerDto {
  @IsBoolean()
  esPropietarioPlataforma: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
