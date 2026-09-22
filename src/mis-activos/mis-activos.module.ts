import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MisActivosController } from './mis-activos.controller';
import { MisActivosService } from './mis-activos.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { AsignacionBolsaTelecom } from '../asignaciones-bolsa-telecom/entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Asignacion,
      AsignacionRecurso,
      Activo,
      LineaTelefonica,
      SuscripcionesLinea,
      PlanesTelefonico,
      AsignacionBolsaTelecom,
      BolsaTelecom,
    ]),
  ],
  controllers: [MisActivosController],
  providers: [MisActivosService],
})
export class MisActivosModule {}
