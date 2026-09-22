import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CambiosEquipoService } from './cambios-equipo.service';
import { CambiosEquipoController } from './cambios-equipo.controller';
import { CambioEquipo } from './entities/cambios-equipo.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DocumentEntity } from '../documents/entities/document.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CambioEquipo,
      Asignacion,
      AsignacionRecurso,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
      DocumentEntity,
    ]),
  ],
  controllers: [CambiosEquipoController],
  providers: [CambiosEquipoService],
})
export class CambiosEquipoModule {}
