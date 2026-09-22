import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidenciasService } from './incidencias.service';
import { IncidenciasController } from './incidencias.controller';
import { Incidencia } from './entities/incidencia.entity';
import { AuditoriaDetalle } from '../auditoria-detalles/entities/auditoria-detalle.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Incidencia,
      AuditoriaDetalle,
      Activo,
      LineaTelefonica,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [IncidenciasController],
  providers: [IncidenciasService],
})
export class IncidenciasModule {}
