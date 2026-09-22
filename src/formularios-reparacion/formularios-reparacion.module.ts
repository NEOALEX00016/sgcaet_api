import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormulariosReparacionService } from './formularios-reparacion.service';
import { FormularioReparacion } from './entities/formularios-reparacion.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioRespuestasModule } from '../formulario-respuestas/formulario-respuestas.module';
import { PoliticasFormularioTallerModule } from '../politicas-formulario-taller/politicas-formulario-taller.module';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { Ubicacione } from '../ubicaciones/entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormularioReparacion,
      ReparacionActivo,
      Activo,
      TiposActivo,
      FormularioVersione,
      Asignacion,
      Persona,
      Departamento,
      Ubicacione,
      Usuario,
      AtributosDinamicosActivo,
      EspecificacionTipoActivo,
    ]),
    FormularioRespuestasModule,
    PoliticasFormularioTallerModule,
  ],
  providers: [FormulariosReparacionService],
  exports: [FormulariosReparacionService],
})
export class FormulariosReparacionModule {}
