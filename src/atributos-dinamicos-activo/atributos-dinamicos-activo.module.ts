import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AtributosDinamicosActivoService } from './atributos-dinamicos-activo.service';
import { AtributosDinamicosActivoController } from './atributos-dinamicos-activo.controller';
import { AtributosDinamicosActivo } from './entities/atributos-dinamicos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AtributosDinamicosActivo,
      Activo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [AtributosDinamicosActivoController],
  providers: [AtributosDinamicosActivoService],
})
export class AtributosDinamicosActivoModule {}
