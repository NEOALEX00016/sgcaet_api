import { Module } from '@nestjs/common';
import { EstructuraOrganizacionalNodosService } from './estructura-organizacional-nodos.service';
import { EstructuraOrganizacionalNodosController } from './estructura-organizacional-nodos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstructuraOrganizacionalNodo } from './entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstructuraOrganizacionalNodo,
      Usuario,
      BitacoraAuditoriaSistema,
    ]),
  ],
  controllers: [EstructuraOrganizacionalNodosController],
  providers: [EstructuraOrganizacionalNodosService],
})
export class EstructuraOrganizacionalNodosModule {}
