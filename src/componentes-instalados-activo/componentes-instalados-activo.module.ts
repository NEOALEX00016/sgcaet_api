import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComponentesInstaladosActivoService } from './componentes-instalados-activo.service';
import { ComponentesInstaladosActivoController } from './componentes-instalados-activo.controller';
import { ComponenteInstaladoActivo } from './entities/componente-instalado-activo.entity';
import { Activo } from '../activos/entities/activo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ComponenteInstaladoActivo, Activo])],
  controllers: [ComponentesInstaladosActivoController],
  providers: [ComponentesInstaladosActivoService],
})
export class ComponentesInstaladosActivoModule {}
