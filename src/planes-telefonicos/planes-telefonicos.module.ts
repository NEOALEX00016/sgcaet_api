import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlanesTelefonicosService } from './planes-telefonicos.service';
import { PlanesTelefonicosController } from './planes-telefonicos.controller';
import { PlanesTelefonico } from './entities/planes-telefonico.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlanesTelefonico,
      Operadora,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [PlanesTelefonicosController],
  providers: [PlanesTelefonicosService],
})
export class PlanesTelefonicosModule {}
