import { Module } from '@nestjs/common';
import { FormularioReglasService } from './formulario-reglas.service';
import { FormularioReglasController } from './formulario-reglas.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormularioRegla } from './entities/formulario-regla.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormularioRegla,
      FormularioVersione,
      FormularioCampo,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [FormularioReglasController],
  providers: [FormularioReglasService],
})
export class FormularioReglasModule {}
