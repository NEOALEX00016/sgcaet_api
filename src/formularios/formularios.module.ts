import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormulariosService } from './formularios.service';
import { FormulariosController } from './formularios.controller';
import { Formulario } from './entities/formulario.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Formulario, Usuario, BitacoraAuditoriaSistema]),
  ],
  controllers: [FormulariosController],
  providers: [FormulariosService],
})
export class FormulariosModule {}
