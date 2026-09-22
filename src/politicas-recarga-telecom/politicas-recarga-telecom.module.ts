import { Module } from '@nestjs/common';
import { PoliticasRecargaTelecomService } from './politicas-recarga-telecom.service';
import { PoliticasRecargaTelecomController } from './politicas-recarga-telecom.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PoliticaRecargaTelecom } from './entities/politicas-recarga-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PoliticaRecargaTelecom, Usuario, BitacoraAuditoriaSistema])],
  controllers: [PoliticasRecargaTelecomController],
  providers: [PoliticasRecargaTelecomService],
})
export class PoliticasRecargaTelecomModule {}
