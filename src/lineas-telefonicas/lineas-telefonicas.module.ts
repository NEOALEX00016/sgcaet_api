import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineasTelefonicasService } from './lineas-telefonicas.service';
import { LineasTelefonicasController } from './lineas-telefonicas.controller';
import { LineaTelefonica } from './entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Persona } from '../personas/entities/persona.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LineaTelefonica,
      Usuario,
      BitacoraAuditoriaSistema,
      Asignacion,
      AsignacionRecurso,
      Persona,
    ]),
  ],
  controllers: [LineasTelefonicasController],
  providers: [LineasTelefonicasService],
})
export class LineasTelefonicasModule {}
