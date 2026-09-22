import { Module } from '@nestjs/common';
import { FuentesEmpleadosService } from './fuentes-empleados.service';
import { FuentesEmpleadosController } from './fuentes-empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FuentesEmpleado } from './entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { SecureHttpClientModule } from '../common/http/secure-http-client.module';
import { SecurityModule } from '../common/security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FuentesEmpleado,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
    SecureHttpClientModule,
    SecurityModule,
  ],
  controllers: [FuentesEmpleadosController],
  providers: [FuentesEmpleadosService],
})
export class FuentesEmpleadosModule {}
