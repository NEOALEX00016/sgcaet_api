import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DominiosEmpresaService } from './dominios-empresa.service';
import { DominiosEmpresaController } from './dominios-empresa.controller';
import { DominiosEmpresa } from './entities/dominios-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DominiosEmpresa,
      BitacoraAuditoriaSistema,
      Empresa,
      Usuario,
    ]),
  ],
  controllers: [DominiosEmpresaController],
  providers: [DominiosEmpresaService, TargetTenantContextService],
})
export class DominiosEmpresaModule {}
