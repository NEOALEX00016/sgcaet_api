import { Module } from '@nestjs/common';
import { AsignacionesLineaPersonaService } from './asignaciones-linea-persona.service';
import { AsignacionesLineaPersonaController } from './asignaciones-linea-persona.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionLineaPersona } from './entities/asignaciones-linea-persona.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AsignacionLineaPersona, LineaTelefonica, Persona, Usuario, BitacoraAuditoriaSistema])],
  controllers: [AsignacionesLineaPersonaController],
  providers: [AsignacionesLineaPersonaService],
})
export class AsignacionesLineaPersonaModule {}
