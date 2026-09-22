import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentificadoresQrActivoService } from './identificadores-qr-activo.service';
import { IdentificadoresQrActivoController } from './identificadores-qr-activo.controller';
import { IdentificadoresQrActivo } from './entities/identificadores-qr-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IdentificadoresQrActivo,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [IdentificadoresQrActivoController],
  providers: [IdentificadoresQrActivoService],
})
export class IdentificadoresQrActivoModule {}
