import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DocumentsService } from './documents.service';
import { DocumentEntity } from './entities/document.entity';
import { DOCUMENT_STORAGE } from './interfaces/document-storage.interface';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';

describe('DocumentsService', () => {
  let service: DocumentsService;

  const documentsRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    insert: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const storageMock = {
    save: jest.fn(),
    read: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };
  const configServiceMock = { get: jest.fn() };
  const dataSourceMock = {
    transaction: jest.fn(async (work) =>
      work({
        getRepository: (entity) => {
          if (entity === DocumentEntity) return documentsRepositoryMock;
          if (entity === BitacoraAuditoriaSistema) return bitacoraRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentsRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: DOCUMENT_STORAGE, useValue: storageMock },
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
    configServiceMock.get.mockImplementation(
      (key: string, fallback: string) => {
        if (key === 'DOCUMENT_MAX_SIZE_MB') return '20';
        if (key === 'DOCUMENT_ALLOWED_MIME_TYPES') return '';
        return fallback;
      },
    );
    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
  });

  it('sube PDF valido', async () => {
    const file = {
      originalname: 'contrato.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('ok'),
    };
    storageMock.save.mockResolvedValue({
      storedName: 'uuid.pdf',
      storagePath: '2026/09/uuid.pdf',
    });
    const created = {
      id: 'doc-1',
      empresaId: user.empresaId,
      originalName: 'contrato.pdf',
      storedName: 'uuid.pdf',
      mimeType: 'application/pdf',
      extension: '.pdf',
      sizeBytes: '1000',
      storagePath: '2026/09/uuid.pdf',
      createdBy: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    documentsRepositoryMock.create.mockReturnValue(created);
    documentsRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({});
    bitacoraRepositoryMock.save.mockResolvedValue({});

    const result = await service.create({}, file, user);
    expect(result.id).toBe('doc-1');
    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(storageMock.save).toHaveBeenCalled();
  });

  it('rechaza MIME no permitido', async () => {
    const file = {
      originalname: 'malware.exe',
      mimetype: 'application/x-msdownload',
      size: 100,
      buffer: Buffer.from('x'),
    };
    await expect(service.create({}, file, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('compensa archivo huerfano si falla DB', async () => {
    const file = {
      originalname: 'contrato.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('ok'),
    };
    storageMock.save.mockResolvedValue({
      storedName: 'uuid.pdf',
      storagePath: '2026/09/uuid.pdf',
    });
    documentsRepositoryMock.create.mockReturnValue({});
    documentsRepositoryMock.save.mockRejectedValue(new Error('db fail'));

    await expect(service.create({}, file, user)).rejects.toThrow('db fail');
    expect(storageMock.remove).toHaveBeenCalledWith('2026/09/uuid.pdf');
  });

  it('restaura metadata si falla borrado fisico en remove', async () => {
    const item = {
      id: 'doc-1',
      empresaId: user.empresaId,
      originalName: 'contrato.pdf',
      storedName: 'uuid.pdf',
      mimeType: 'application/pdf',
      extension: '.pdf',
      sizeBytes: '1000',
      storagePath: '2026/09/uuid.pdf',
      createdBy: user.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      entidadRelacionada: 'asignaciones',
      entidadRelacionadaId: 'asg-1',
    };
    documentsRepositoryMock.findOne.mockResolvedValue(item);
    storageMock.exists.mockResolvedValue(true);
    documentsRepositoryMock.delete.mockResolvedValue({ affected: 1 });
    storageMock.remove.mockRejectedValue(new Error('fs fail'));
    bitacoraRepositoryMock.create.mockReturnValue({});
    bitacoraRepositoryMock.save.mockResolvedValue({});
    documentsRepositoryMock.insert.mockResolvedValue({});

    await expect(service.remove('doc-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(documentsRepositoryMock.insert).toHaveBeenCalled();
  });

  it('view falla cuando archivo fisico no existe', async () => {
    documentsRepositoryMock.findOne.mockResolvedValue({
      id: 'doc-1',
      empresaId: user.empresaId,
      storagePath: '2026/09/doc.pdf',
      mimeType: 'application/pdf',
    });
    storageMock.exists.mockResolvedValue(false);
    await expect(service.view('doc-1', user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('view rechaza mime no inline', async () => {
    documentsRepositoryMock.findOne.mockResolvedValue({
      id: 'doc-1',
      empresaId: user.empresaId,
      storagePath: '2026/09/doc.docx',
      mimeType:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    await expect(service.view('doc-1', user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
