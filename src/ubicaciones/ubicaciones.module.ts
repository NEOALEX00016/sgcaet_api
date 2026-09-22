import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UbicacionesService } from './ubicaciones.service';
import { UbicacionesController } from './ubicaciones.controller';
import { Ubicacione } from './entities/ubicacione.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ubicacione, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [UbicacionesController],
  providers: [UbicacionesService],
})
export class UbicacionesModule {}
