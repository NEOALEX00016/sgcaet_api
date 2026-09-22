import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriaEquipo } from './entities/categoria-equipo.entity';
import { CategoriasEquipoService } from './categorias-equipo.service';
import { CategoriasEquipoController } from './categorias-equipo.controller';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoriaEquipo,
      TiposActivo,
      DominioCatalogoActivo,
    ]),
  ],
  controllers: [CategoriasEquipoController],
  providers: [CategoriasEquipoService],
  exports: [CategoriasEquipoService],
})
export class CategoriasEquipoModule {}
