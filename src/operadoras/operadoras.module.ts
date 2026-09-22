import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperadorasService } from './operadoras.service';
import { OperadorasController } from './operadoras.controller';
import { Operadora } from './entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Operadora, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [OperadorasController],
  providers: [OperadorasService],
})
export class OperadorasModule {}
