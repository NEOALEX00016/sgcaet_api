import { IsInt, IsObject, IsOptional, IsString, IsUrl, IsUUID, Length, Max, Min } from 'class-validator';

export class ImportPersonasApiDto {
  @IsUUID()
  fuenteEmpleadosId: string;

  @IsOptional()
  @IsString()
  @Length(1, 180)
  endpointPath?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  endpointUrl?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30000)
  timeoutMs?: number;
}
