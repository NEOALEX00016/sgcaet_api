import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DireccionesEmpresaService } from './direcciones-empresa.service';
import { DireccionesEmpresaController } from './direcciones-empresa.controller';
import { DireccionesEmpresa } from './entities/direcciones-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { TargetTenantContextService } from '../auth/target-tenant-context.service';
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DireccionesEmpresa,
      BitacoraAuditoriaSistema,
      Empresa,
      Usuario,
    ]),
  ],
  controllers: [DireccionesEmpresaController],
  providers: [DireccionesEmpresaService, TargetTenantContextService],
})
export class DireccionesEmpresaModule {}
