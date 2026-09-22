import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EspecificacionTipoActivo } from './entities/especificacion-tipo-activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { EspecificacionesTipoActivoService } from './especificaciones-tipo-activo.service';
import { EspecificacionesTipoActivoController } from './especificaciones-tipo-activo.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EspecificacionTipoActivo,
      TiposActivo,
      CategoriaEquipo,
    ]),
  ],
  controllers: [EspecificacionesTipoActivoController],
  providers: [EspecificacionesTipoActivoService],
})
export class EspecificacionesTipoActivoModule {}
