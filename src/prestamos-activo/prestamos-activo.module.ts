import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrestamosActivoService } from './prestamos-activo.service';
import { PrestamosActivoController } from './prestamos-activo.controller';
import { PrestamoActivo } from './entities/prestamos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PrestamoActivo,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [PrestamosActivoController],
  providers: [PrestamosActivoService],
  exports: [PrestamosActivoService],
})
export class PrestamosActivoModule {}
