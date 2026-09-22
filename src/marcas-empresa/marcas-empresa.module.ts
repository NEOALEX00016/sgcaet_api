import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarcasEmpresaService } from './marcas-empresa.service';
import { MarcasEmpresaController } from './marcas-empresa.controller';
import { MarcasEmpresa } from './entities/marcas-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      MarcasEmpresa,
      BitacoraAuditoriaSistema,
      Empresa,
      Usuario,
    ]),
  ],
  controllers: [MarcasEmpresaController],
  providers: [MarcasEmpresaService, TargetTenantContextService],
})
export class MarcasEmpresaModule {}
