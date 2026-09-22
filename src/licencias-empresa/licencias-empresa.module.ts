import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LicenciasEmpresaService } from './licencias-empresa.service';
import { LicenciasEmpresaController } from './licencias-empresa.controller';
import { LicenciaEmpresa } from './entities/licencias-empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
import { LicenciaFirmaService } from './licencia-firma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      LicenciaEmpresa,
      Empresa,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [LicenciasEmpresaController],
  providers: [LicenciasEmpresaService, TargetTenantContextService, LicenciaFirmaService],
  exports: [LicenciasEmpresaService],
})
export class LicenciasEmpresaModule {}
