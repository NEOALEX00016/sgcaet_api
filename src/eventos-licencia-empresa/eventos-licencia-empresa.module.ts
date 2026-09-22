import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventosLicenciaEmpresaService } from './eventos-licencia-empresa.service';
import { EventosLicenciaEmpresaController } from './eventos-licencia-empresa.controller';
import { EventosLicenciaEmpresa } from './entities/eventos-licencia-empresa.entity';
import { LicenciaEmpresa } from '../licencias-empresa/entities/licencias-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      EventosLicenciaEmpresa,
      LicenciaEmpresa,
      Empresa,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [EventosLicenciaEmpresaController],
  providers: [EventosLicenciaEmpresaService, TargetTenantContextService],
})
export class EventosLicenciaEmpresaModule {}
