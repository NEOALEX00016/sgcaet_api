import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';
export class CreateFuentesEmpleadoDto {
  @IsString() @Length(1, 140) nombre: string;
  @IsIn(['api_rest', 'base_datos', 'archivo_csv']) tipoFuente: string;
  @IsOptional() @IsIn(['activa', 'inactiva', 'error']) estado?: string;
  @IsOptional() @IsString() urlBase?: string;
  @IsOptional() @IsString() metodoAutenticacion?: string;
  @IsOptional() @IsString() usuarioTecnico?: string;
  @IsOptional() @IsString() secretoCifrado?: string;
  @IsOptional() @IsString() esquemaBd?: string;
  @IsOptional() @IsString() tablaOVista?: string;
  @IsOptional() @IsString() consultaSql?: string;
  @IsObject() mapeoCampos: Record<string, unknown>;
  @IsOptional() @IsBoolean() usaVerificacionBaja?: boolean;
}
