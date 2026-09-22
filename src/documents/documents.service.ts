import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { extname } from 'path';
import { DataSource, Repository } from 'typeorm';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateDocumentDto } from './dto/create-document.dto';
import { DocumentQueryDto } from './dto/document-query.dto';
import { DocumentEntity } from './entities/document.entity';
import { DOCUMENT_STORAGE } from './interfaces/document-storage.interface';
import type { DocumentStorage } from './interfaces/document-storage.interface';
import { Inject } from '@nestjs/common';
import { Usuario } from '../usuarios/entities/usuario.entity';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const defaultAllowedMimeTypes = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
];

const allowedExtensions = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.txt',
]);

const mimeExtensionsMap: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'text/plain': ['.txt'],
};

const inlineMimeTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
]);

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(DocumentEntity)
    private readonly documentsRepository: Repository<DocumentEntity>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @Inject(DOCUMENT_STORAGE)
    private readonly storage: DocumentStorage,
    private readonly configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    dto: CreateDocumentDto,
    file: UploadedFile,
    user: AuthenticatedUser,
  ) {
    await this.validarActor(user);
    this.validateFile(file);

    const extension = this.resolveExtension(file.originalname);
    this.validateMimeAndExtension(file.mimetype, extension);
    const stored = await this.storage.save({
      fileBuffer: file.buffer,
      extension,
    });

    try {
      const saved = await this.dataSource.transaction(async (manager) => {
        const documentsRepository = manager.getRepository(DocumentEntity);
        const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

        const entity = documentsRepository.create({
          empresaId: user.empresaId,
          entidadRelacionada: dto.entidadRelacionada,
          entidadRelacionadaId: dto.entidadRelacionadaId,
          originalName: file.originalname,
          storedName: stored.storedName,
          mimeType: file.mimetype,
          extension,
          sizeBytes: String(file.size),
          storagePath: stored.storagePath,
          createdBy: user.userId,
        });

        const created = await documentsRepository.save(entity);
        await this.registrarBitacora(
          user,
          'DOCUMENTS_CREATE',
          created.id,
          null,
          {
            originalName: created.originalName,
            mimeType: created.mimeType,
            sizeBytes: created.sizeBytes,
            entidadRelacionada: dto.entidadRelacionada,
            entidadRelacionadaId: dto.entidadRelacionadaId,
          },
          bitacoraRepository,
        );

        return created;
      });

      return this.toPublic(saved);
    } catch (error) {
      await this.storage.remove(stored.storagePath);
      throw error;
    }
  }

  async findAll(query: DocumentQueryDto, user: AuthenticatedUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.documentsRepository
      .createQueryBuilder('document')
      .where('document.empresa_id = :empresaId', { empresaId: user.empresaId });

    if (query.mimeType)
      qb.andWhere('document.mime_type = :mimeType', {
        mimeType: query.mimeType,
      });
    if (query.createdBy)
      qb.andWhere('document.created_by = :createdBy', {
        createdBy: query.createdBy,
      });
    if (query.dateFrom)
      qb.andWhere('document.created_at >= :dateFrom', {
        dateFrom: query.dateFrom,
      });
    if (query.dateTo)
      qb.andWhere('document.created_at <= :dateTo', { dateTo: query.dateTo });
    if (query.search?.trim()) {
      qb.andWhere('document.original_name ILIKE :search', {
        search: `%${query.search.trim()}%`,
      });
    }

    qb.orderBy('document.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return {
      items: items.map((item) => this.toPublic(item)),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.documentsRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException(`Documento ${id} no encontrado`);
    return this.toPublic(item);
  }

  async view(id: string, user: AuthenticatedUser) {
    const item = await this.documentsRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException(`Documento ${id} no encontrado`);
    if (!inlineMimeTypes.has(item.mimeType)) {
      throw new BadRequestException(
        'Este documento no es compatible con vista inline; use el endpoint de descarga',
      );
    }
    const exists = await this.storage.exists(item.storagePath);
    if (!exists) throw new NotFoundException('Archivo fisico inexistente');
    const content = await this.storage.read(item.storagePath);
    return { item, content };
  }

  async download(id: string, user: AuthenticatedUser) {
    const item = await this.documentsRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException(`Documento ${id} no encontrado`);
    const exists = await this.storage.exists(item.storagePath);
    if (!exists) throw new NotFoundException('Archivo fisico inexistente');
    const content = await this.storage.read(item.storagePath);
    return { item, content };
  }

  async remove(id: string, user: AuthenticatedUser) {
    await this.validarActor(user);
    const item = await this.documentsRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException(`Documento ${id} no encontrado`);

    const exists = await this.storage.exists(item.storagePath);
    if (!exists) throw new NotFoundException('Archivo fisico inexistente');

    await this.dataSource.transaction(async (manager) => {
      const documentsRepository = manager.getRepository(DocumentEntity);
      const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

      await documentsRepository.delete({
        id: item.id,
        empresaId: user.empresaId,
      });
      await this.registrarBitacora(
        user,
        'DOCUMENTS_DELETE',
        item.id,
        {
          originalName: item.originalName,
          mimeType: item.mimeType,
        },
        null,
        bitacoraRepository,
      );
    });

    try {
      await this.storage.remove(item.storagePath);
    } catch (error) {
      await this.dataSource.transaction(async (manager) => {
        const documentsRepository = manager.getRepository(DocumentEntity);
        const bitacoraRepository = manager.getRepository(BitacoraAuditoriaSistema);

        await documentsRepository.insert({
          id: item.id,
          empresaId: item.empresaId,
          entidadRelacionada: item.entidadRelacionada,
          entidadRelacionadaId: item.entidadRelacionadaId,
          originalName: item.originalName,
          storedName: item.storedName,
          mimeType: item.mimeType,
          extension: item.extension,
          sizeBytes: item.sizeBytes,
          storagePath: item.storagePath,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        });

        await this.registrarBitacora(
          user,
          'DOCUMENTS_DELETE_COMPENSATED',
          item.id,
          {
            error: error instanceof Error ? error.message : 'storage remove failed',
          },
          {
            restored: true,
            originalName: item.originalName,
          },
          bitacoraRepository,
        );
      });

      throw new BadRequestException(
        'No se pudo completar la eliminacion fisica del documento; metadata restaurada.',
      );
    }

    return { ok: true };
  }

  private validateFile(file?: UploadedFile) {
    if (!file) throw new BadRequestException('Archivo no enviado');

    const maxSizeMb = Number(
      this.configService.get<string>('DOCUMENT_MAX_SIZE_MB', '20'),
    );
    const maxSizeBytes = Math.max(1, maxSizeMb) * 1024 * 1024;
    if (!file.buffer?.length || file.size > maxSizeBytes) {
      throw new BadRequestException(
        `Archivo demasiado grande (max ${maxSizeMb} MB)`,
      );
    }

    const allowed = this.getAllowedMimeTypes();
    if (!allowed.has(file.mimetype))
      throw new BadRequestException('Tipo de archivo no permitido');
  }

  private getAllowedMimeTypes(): Set<string> {
    const configured = this.configService.get<string>(
      'DOCUMENT_ALLOWED_MIME_TYPES',
      '',
    );
    if (!configured.trim()) return new Set(defaultAllowedMimeTypes);
    return new Set(
      configured
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    );
  }

  private resolveExtension(originalName: string): string {
    const ext = extname(originalName || '').toLowerCase();
    if (!ext || ext.length > 12)
      throw new BadRequestException('Extension de archivo no valida');
    if (!allowedExtensions.has(ext))
      throw new BadRequestException('Extension de archivo no permitida');
    return ext;
  }

  private validateMimeAndExtension(mimeType: string, extension: string): void {
    const expected = mimeExtensionsMap[mimeType];
    if (!expected?.includes(extension)) {
      throw new BadRequestException('Inconsistencia entre MIME type y extension');
    }
  }

  private toPublic(item: DocumentEntity) {
    return {
      id: item.id,
      originalName: item.originalName,
      mimeType: item.mimeType,
      extension: item.extension,
      size: Number(item.sizeBytes),
      entidadRelacionada: item.entidadRelacionada,
      entidadRelacionadaId: item.entidadRelacionadaId,
      createdBy: item.createdBy,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      viewUrl: `/documents/${item.id}/view`,
      downloadUrl: `/documents/${item.id}/download`,
    };
  }

  private async registrarBitacora(
    user: AuthenticatedUser,
    accion: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
    bitacoraRepository: Repository<BitacoraAuditoriaSistema> =
      this.bitacoraRepository,
  ) {
    const registro = bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad: 'documents',
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });
    await bitacoraRepository.save(registro);
  }

  private async validarActor(user: AuthenticatedUser): Promise<void> {
    const actor = await this.usuariosRepository.findOne({
      where: { id: user.userId, empresaId: user.empresaId },
    });
    if (!actor)
      throw new NotFoundException(
        'Usuario actor no encontrado para la empresa indicada',
      );
  }
}
