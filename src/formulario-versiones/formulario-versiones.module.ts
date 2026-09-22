import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormularioVersionesService } from './formulario-versiones.service';
import { FormularioVersionesController } from './formulario-versiones.controller';
import { FormularioVersione } from './entities/formulario-versione.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FormularioVersione,
      Formulario,
      FormularioCampo,
      FormularioRegla,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [FormularioVersionesController],
  providers: [FormularioVersionesService],
})
export class FormularioVersionesModule {}
