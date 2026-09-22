import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartamentosService } from './departamentos.service';
import { DepartamentosController } from './departamentos.controller';
import { Departamento } from './entities/departamento.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Departamento, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [DepartamentosController],
  providers: [DepartamentosService],
})
export class DepartamentosModule {}
