import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormularioRespuestasService } from './formulario-respuestas.service';
import { FormularioRespuestasController } from './formulario-respuestas.controller';
import { FormularioRespuesta } from './entities/formulario-respuesta.entity';
import { FormularioRespuestaDetalle } from './entities/formulario-respuesta-detalle.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Evidencia } from '../evidencias/entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormularioRespuesta,
      FormularioRespuestaDetalle,
      FormularioVersione,
      FormularioCampo,
      FormularioRegla,
      Usuario,
      Evidencia,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [FormularioRespuestasController],
  providers: [FormularioRespuestasService],
})
export class FormularioRespuestasModule {}
