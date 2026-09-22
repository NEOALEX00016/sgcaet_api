import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { extname, isAbsolute, join, resolve } from 'path';
import { promises as fs } from 'fs';
import { Repository } from 'typeorm';
import { CreateEvidenciaDto } from './dto/create-evidencia.dto';
import { UpdateEvidenciaDto } from './dto/update-evidencia.dto';
import { Evidencia } from './entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

type UploadedFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

type EvidenciaMetadata = Record<string, unknown> & {
  originalName?: string;
  storagePath?: string;
};

@Injectable()
export class EvidenciasService {
  constructor(
    @InjectRepository(Evidencia)
    private readonly evidenciasRepository: Repository<Evidencia>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    private readonly configService: ConfigService,
  ) {}

  async createFromUpload(
    createEvidenciaDto: CreateEvidenciaDto,
    file: UploadedFile,
    user: AuthenticatedUser,
  ): Promise<Evidencia> {
    this.validarArchivo(file);
    const now = new Date();
    const year = String(now.getUTCFullYear());
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const root = this.getStorageRoot();
    const folder = join(root, year, month);

    await fs.mkdir(folder, { recursive: true });

    const extension = extname(file.originalname || '').toLowerCase();
    const uuidName = `${randomUUID()}${extension}`;
    const absoluteFilePath = join(folder, uuidName);
    await fs.writeFile(absoluteFilePath, file.buffer);

    const relativePath = `${year}/${month}/${uuidName}`;
    const evidenciaId = randomUUID();
    const evidencia = this.evidenciasRepository.create({
      id: evidenciaId,
      ...createEvidenciaDto,
      empresaId: user.empresaId,
      creadoPor: user.userId,
      nombreArchivo: uuidName,
      urlArchivo: `/evidencias/${evidenciaId}/archivo`,
      mimeType: file.mimetype,
      tamanoBytes: String(file.size),
      metadata: {
        ...(createEvidenciaDto.metadata ?? {}),
        originalName: file.originalname,
        storagePath: relativePath,
      },
    });

    let saved: Evidencia;
    try {
      saved = await this.evidenciasRepository.save(evidencia);
    } catch (error) {
      await fs.unlink(absoluteFilePath).catch(() => undefined);
      throw error;
    }

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'EVIDENCIAS_SUBIR',
      'evidencias',
      saved.id,
      null,
      {
        entidadRelacionada: saved.entidadRelacionada,
        entidadRelacionadaId: saved.entidadRelacionadaId,
        tipoEvidencia: saved.tipoEvidencia,
        nombreArchivo: saved.nombreArchivo,
      },
    );

    return saved;
  }

  async findAll(empresaId?: string): Promise<Evidencia[]> {
    const items = await this.evidenciasRepository.find({
      where: empresaId ? { empresaId } : {},
      order: { createdAt: 'DESC' },
    });

    return items.map((item) => this.toPublicEvidencia(item));
  }

  async findOne(id: string, empresaId: string): Promise<Evidencia> {
    const evidencia = await this.evidenciasRepository.findOne({
      where: { id, empresaId },
    });
    if (!evidencia) {
      throw new NotFoundException(`Evidencia ${id} no encontrada`);
    }

    return this.toPublicEvidencia(evidencia);
  }

  async readFile(
    id: string,
    empresaId: string,
  ): Promise<{ evidencia: Evidencia; mimeType: string; content: Buffer }> {
    const evidencia = await this.evidenciasRepository.findOne({
      where: { id, empresaId },
    });
    if (!evidencia) {
      throw new NotFoundException(`Evidencia ${id} no encontrada`);
    }

    const absolutePath = this.resolveAbsolutePath(evidencia);
    const content = await fs.readFile(absolutePath).catch(() => {
      throw new NotFoundException(
        'Archivo de evidencia no disponible en storage',
      );
    });

    return {
      evidencia: this.toPublicEvidencia(evidencia),
      mimeType: evidencia.mimeType ?? 'application/octet-stream',
      content,
    };
  }

  async update(
    id: string,
    updateEvidenciaDto: UpdateEvidenciaDto,
    user: AuthenticatedUser,
  ): Promise<Evidencia> {
    const actual = await this.findOne(id, user.empresaId);
    const merged = this.evidenciasRepository.merge(actual, updateEvidenciaDto);
    const saved = await this.evidenciasRepository.save(merged);
    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'EVIDENCIAS_ACTUALIZAR',
      'evidencias',
      saved.id,
      null,
      {
        tipoEvidencia: saved.tipoEvidencia,
      },
    );
    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user.empresaId);

    const absolutePath = this.resolveAbsolutePath(actual);
    await fs.unlink(absolutePath).catch(() => undefined);

    await this.evidenciasRepository.delete({ id: actual.id });
    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'EVIDENCIAS_ELIMINAR',
      'evidencias',
      actual.id,
      {
        nombreArchivo: actual.nombreArchivo,
      },
      null,
    );
  }

  private validarArchivo(file: UploadedFile): void {
    const allowed = new Set([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ]);
    if (!file?.buffer?.length || file.size > 10 * 1024 * 1024) {
      throw new BadRequestException(
        'Archivo vacio o excede el limite de 10 MB',
      );
    }
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException('Tipo MIME no permitido');
    }
  }

  private getStorageRoot(): string {
    const configured = this.configService.get<string>(
      'EVIDENCIAS_STORAGE_PATH',
      'storage/evidencias',
    );
    return isAbsolute(configured)
      ? configured
      : resolve(process.cwd(), configured);
  }

  private resolveAbsolutePath(evidencia: Evidencia): string {
    const root = this.getStorageRoot();
    const metadata = (evidencia.metadata ?? {}) as EvidenciaMetadata;

    if (metadata.storagePath) {
      return join(root, ...metadata.storagePath.split('/'));
    }

    const legacyPrefix = '/evidencias/';
    if (evidencia.urlArchivo.startsWith(legacyPrefix)) {
      const relativePath = evidencia.urlArchivo.slice(legacyPrefix.length);
      return join(root, ...relativePath.split('/'));
    }

    throw new NotFoundException(
      'No se pudo resolver la ubicacion fisica del archivo de evidencia',
    );
  }

  private toPublicEvidencia(evidencia: Evidencia): Evidencia {
    return { ...evidencia, urlArchivo: `/evidencias/${evidencia.id}/archivo` };
  }

  private async registrarBitacora(
    usuarioActorId: string | undefined,
    empresaId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId,
      usuarioActorId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }
}
