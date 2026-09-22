import { Module } from '@nestjs/common';
import { TiposNodoOrganizacionService } from './tipos-nodo-organizacion.service';
import { TiposNodoOrganizacionController } from './tipos-nodo-organizacion.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TiposNodoOrganizacion } from './entities/tipos-nodo-organizacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TiposNodoOrganizacion,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [TiposNodoOrganizacionController],
  providers: [TiposNodoOrganizacionService],
})
export class TiposNodoOrganizacionModule {}
