import { Module } from '@nestjs/common';
import { FormularioCamposService } from './formulario-campos.service';
import { FormularioCamposController } from './formulario-campos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormularioCampo } from './entities/formulario-campo.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormularioCampo,
      FormularioVersione,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [FormularioCamposController],
  providers: [FormularioCamposService],
})
export class FormularioCamposModule {}
