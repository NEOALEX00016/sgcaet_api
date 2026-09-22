import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExistenciasRepuestosService } from './existencias-repuestos.service';
import { ExistenciasRepuestosController } from './existencias-repuestos.controller';
import { ExistenciaRepuesto } from './entities/existencias-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExistenciaRepuesto, PiezaRepuesto])],
  controllers: [ExistenciasRepuestosController],
  providers: [ExistenciasRepuestosService],
})
export class ExistenciasRepuestosModule {}
