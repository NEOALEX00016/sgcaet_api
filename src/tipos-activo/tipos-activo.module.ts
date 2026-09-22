import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposActivoService } from './tipos-activo.service';
import { TiposActivoController } from './tipos-activo.controller';
import { TiposActivo } from './entities/tipos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TiposActivo,
      Activo,
      CategoriaEquipo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [TiposActivoController],
  providers: [TiposActivoService],
})
export class TiposActivoModule {}
