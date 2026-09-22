import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfiguracionOperativaTenant } from './entities/configuracion-operativa-tenant.entity';
import { ConfiguracionOperativaTenantController } from './configuracion-operativa-tenant.controller';
import { ConfiguracionOperativaTenantService } from './configuracion-operativa-tenant.service';
import { SecurityModule } from '../common/security/security.module';
import { SecureHttpClientModule } from '../common/http/secure-http-client.module';
import { LicenciaEmpresa } from '../licencias-empresa/entities/licencias-empresa.entity';
import { LicenciaFirmaService } from '../licencias-empresa/licencia-firma.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([ConfiguracionOperativaTenant, LicenciaEmpresa]),
    SecurityModule,
    SecureHttpClientModule,
  ],
  controllers: [ConfiguracionOperativaTenantController],
  providers: [ConfiguracionOperativaTenantService, LicenciaFirmaService],
  exports: [ConfiguracionOperativaTenantService],
})
export class ConfiguracionOperativaTenantModule {}
