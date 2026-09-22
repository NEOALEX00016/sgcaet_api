import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliticasFormularioTallerService } from './politicas-formulario-taller.service';
import { PoliticasFormularioTallerController } from './politicas-formulario-taller.controller';
import { PoliticaFormularioTaller } from './entities/politicas-formulario-taller.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PoliticaFormularioTaller,
      CategoriaEquipo,
      TiposActivo,
      Formulario,
    ]),
  ],
  controllers: [PoliticasFormularioTallerController],
  providers: [PoliticasFormularioTallerService],
  exports: [PoliticasFormularioTallerService],
})
export class PoliticasFormularioTallerModule {}
