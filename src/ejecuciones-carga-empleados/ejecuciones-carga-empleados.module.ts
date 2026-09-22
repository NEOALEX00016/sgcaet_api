import { Module } from '@nestjs/common';
import { EjecucionesCargaEmpleadosService } from './ejecuciones-carga-empleados.service';
import { EjecucionesCargaEmpleadosController } from './ejecuciones-carga-empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EjecucionesCargaEmpleado } from './entities/ejecuciones-carga-empleado.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EjecucionesCargaEmpleado,
      FuentesEmpleado,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [EjecucionesCargaEmpleadosController],
  providers: [EjecucionesCargaEmpleadosService],
})
export class EjecucionesCargaEmpleadosModule {}
