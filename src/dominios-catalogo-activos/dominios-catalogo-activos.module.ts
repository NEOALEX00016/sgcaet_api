import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DominioCatalogoActivo } from './entities/dominio-catalogo-activo.entity';
import { DominiosCatalogoActivosService } from './dominios-catalogo-activos.service';
import { DominiosCatalogoActivosController } from './dominios-catalogo-activos.controller';
@Module({
  imports: [TypeOrmModule.forFeature([DominioCatalogoActivo])],
  controllers: [DominiosCatalogoActivosController],
  providers: [DominiosCatalogoActivosService],
  exports: [DominiosCatalogoActivosService],
})
export class DominiosCatalogoActivosModule {}
