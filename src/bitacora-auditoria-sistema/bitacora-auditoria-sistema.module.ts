import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraAuditoriaSistemaService } from './bitacora-auditoria-sistema.service';
import { BitacoraAuditoriaSistemaController } from './bitacora-auditoria-sistema.controller';
import { BitacoraAuditoriaSistema } from './entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';

@Module({
  imports: [TypeOrmModule.forFeature([BitacoraAuditoriaSistema, Empresa, Usuario])],
  controllers: [BitacoraAuditoriaSistemaController],
  providers: [BitacoraAuditoriaSistemaService, TargetTenantContextService],
})
export class BitacoraAuditoriaSistemaModule {}
