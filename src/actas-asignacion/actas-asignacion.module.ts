import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActaAsignacion } from './entities/acta-asignacion.entity';
import { ActaAsignacionRecurso } from './entities/acta-asignacion-recurso.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { PoliticaFormularioAsignacion } from '../politicas-formulario-asignacion/entities/politicas-formulario-asignacion.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { DocumentEntity } from '../documents/entities/document.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Departamento } from '../departamentos/entities/departamento.entity';
import { AtributosDinamicosActivo } from '../atributos-dinamicos-activo/entities/atributos-dinamicos-activo.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { ActasAsignacionService } from './actas-asignacion.service';
import { ActasAsignacionController } from './actas-asignacion.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ActaAsignacion,
      ActaAsignacionRecurso,
      Asignacion,
      AsignacionRecurso,
      PoliticaFormularioAsignacion,
      FormularioVersione,
      Activo,
      TiposActivo,
      CategoriaEquipo,
      DominioCatalogoActivo,
      DocumentEntity,
      Formulario,
      Persona,
      Usuario,
      Departamento,
      AtributosDinamicosActivo,
      EspecificacionTipoActivo,
    ]),
  ],
  controllers: [ActasAsignacionController],
  providers: [ActasAsignacionService],
})
export class ActasAsignacionModule {}
