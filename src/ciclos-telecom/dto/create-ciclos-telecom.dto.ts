import { IsDateString, IsUUID } from 'class-validator';
export class CreateCiclosTelecomDto { @IsUUID() poolTelecomId: string; @IsDateString() iniciaEn: string; @IsDateString() terminaEn: string; }
