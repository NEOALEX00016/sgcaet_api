import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaDetallesService } from './auditoria-detalles.service';
import { AuditoriaDetallesController } from './auditoria-detalles.controller';
import { AuditoriaDetalle } from './entities/auditoria-detalle.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AuditoriaDetalle,
      Auditoria,
      Activo,
      Persona,
      Usuario,
      BitacoraAuditoriaSistema,
      TiposActivo,
      CategoriaEquipo,
    ]),
  ],
  controllers: [AuditoriaDetallesController],
  providers: [AuditoriaDetallesService],
})
export class AuditoriaDetallesModule {}
