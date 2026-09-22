import { Module } from '@nestjs/common';
import { HistorialComponentesActivoService } from './historial-componentes-activo.service';
import { HistorialComponentesActivoController } from './historial-componentes-activo.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistorialComponentesActivo } from './entities/historial-componentes-activo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([HistorialComponentesActivo])],
  controllers: [HistorialComponentesActivoController],
  providers: [HistorialComponentesActivoService],
  exports: [HistorialComponentesActivoService],
})
export class HistorialComponentesActivoModule {}
