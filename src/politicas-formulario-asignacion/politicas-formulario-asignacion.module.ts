import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliticasFormularioAsignacionService } from './politicas-formulario-asignacion.service';
import { PoliticasFormularioAsignacionController } from './politicas-formulario-asignacion.controller';
import { PoliticaFormularioAsignacion } from './entities/politicas-formulario-asignacion.entity';
import { TipoAsignacion } from '../tipos-asignacion/entities/tipos-asignacion.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PoliticaFormularioAsignacion,
      TipoAsignacion,
      DominioCatalogoActivo,
      CategoriaEquipo,
      Formulario,
    ]),
  ],
  controllers: [PoliticasFormularioAsignacionController],
  providers: [PoliticasFormularioAsignacionService],
})
export class PoliticasFormularioAsignacionModule {}
