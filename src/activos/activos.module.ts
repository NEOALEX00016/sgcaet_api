import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivosService } from './activos.service';
import { ActivosController } from './activos.controller';
import { Activo } from './entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
      AsignacionRecurso,
    ]),
  ],
  controllers: [ActivosController],
  providers: [ActivosService],
})
export class ActivosModule {}
