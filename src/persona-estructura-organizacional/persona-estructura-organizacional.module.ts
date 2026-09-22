import { Module } from '@nestjs/common';
import { PersonaEstructuraOrganizacionalService } from './persona-estructura-organizacional.service';
import { PersonaEstructuraOrganizacionalController } from './persona-estructura-organizacional.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonaEstructuraOrganizacional } from './entities/persona-estructura-organizacional.entity';
import { Persona } from '../personas/entities/persona.entity';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonaEstructuraOrganizacional,
      Persona,
      EstructuraOrganizacionalNodo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [PersonaEstructuraOrganizacionalController],
  providers: [PersonaEstructuraOrganizacionalService],
})
export class PersonaEstructuraOrganizacionalModule {}
