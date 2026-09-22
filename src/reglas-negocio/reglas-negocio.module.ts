import { Module } from '@nestjs/common';
import { ReglasNegocioService } from './reglas-negocio.service';
import { ReglasNegocioController } from './reglas-negocio.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReglaNegocio } from './entities/reglas-negocio.entity';
import { EvaluacionReglaNegocio } from './entities/evaluacion-regla-negocio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ReglaNegocio, EvaluacionReglaNegocio, Usuario, BitacoraAuditoriaSistema])],
  controllers: [ReglasNegocioController],
  providers: [ReglasNegocioService],
  exports: [ReglasNegocioService],
})
export class ReglasNegocioModule {}
