import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { DocumentEntity } from './entities/document.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DOCUMENT_STORAGE } from './interfaces/document-storage.interface';
import { LocalDocumentStorageService } from './storage/local-document-storage.service';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      DocumentEntity,
      BitacoraAuditoriaSistema,
      Usuario,
      ReparacionActivo,
    ]),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    LocalDocumentStorageService,
    {
      provide: DOCUMENT_STORAGE,
      useExisting: LocalDocumentStorageService,
    },
  ],
  exports: [DocumentsService],
})
export class DocumentsModule {}
