import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevolucionesService } from './devoluciones.service';
import { DevolucionesController } from './devoluciones.controller';
import { Devolucion } from './entities/devolucione.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Activo } from '../activos/entities/activo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Devolucion,
      Asignacion,
      AsignacionRecurso,
      Usuario,
      BitacoraAuditoriaSistema,
      DocumentEntity,
      Activo,
    ]),
  ],
  controllers: [DevolucionesController],
  providers: [DevolucionesService],
})
export class DevolucionesModule {}
