import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposAsignacionService } from './tipos-asignacion.service';
import { TiposAsignacionController } from './tipos-asignacion.controller';
import { TipoAsignacion } from './entities/tipos-asignacion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TipoAsignacion])],
  controllers: [TiposAsignacionController],
  providers: [TiposAsignacionService],
})
export class TiposAsignacionModule {}
