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
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';
import { PermissionsEvaluatorService } from '../auth/permissions-evaluator.service';

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
  const reparacionesRepositoryMock = { findOne: jest.fn() };
  const permissionsMock = { requireAny: jest.fn() };
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
          if (entity === BitacoraAuditoriaSistema)
            return bitacoraRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  function queryBuilderMock() {
    const qb = {
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    Object.values(qb).forEach((method) => {
      if (jest.isMockFunction(method) && method !== qb.getManyAndCount)
        method.mockReturnValue(qb);
    });
    return qb;
  }

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
        {
          provide: getRepositoryToken(ReparacionActivo),
          useValue: reparacionesRepositoryMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: DOCUMENT_STORAGE, useValue: storageMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: PermissionsEvaluatorService, useValue: permissionsMock },
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
    permissionsMock.requireAny.mockResolvedValue(undefined);
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

  it('filtra metadata por entidad relacionada e id en el servidor', async () => {
    const qb = queryBuilderMock();
    documentsRepositoryMock.createQueryBuilder.mockReturnValue(qb);

    await service.findAll(
      {
        entidadRelacionada: 'reparaciones_activo',
        entidadRelacionadaId: '33333333-3333-4333-8333-333333333333',
      },
      user,
    );

    expect(qb.andWhere).toHaveBeenCalledWith(
      'document.entidad_relacionada = :entidadRelacionada',
      { entidadRelacionada: 'reparaciones_activo' },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      'document.entidad_relacionada_id = :entidadRelacionadaId',
      { entidadRelacionadaId: '33333333-3333-4333-8333-333333333333' },
    );
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

  it('rechaza relacion de reparacion perteneciente a otro tenant antes de guardar archivo', async () => {
    reparacionesRepositoryMock.findOne.mockResolvedValue(null);
    const file = {
      originalname: 'diagnostico.pdf',
      mimetype: 'application/pdf',
      size: 1000,
      buffer: Buffer.from('ok'),
    };

    await expect(
      service.create(
        {
          entidadRelacionada: 'reparaciones_activo',
          entidadRelacionadaId: '33333333-3333-4333-8333-333333333333',
        },
        file,
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(reparacionesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: '33333333-3333-4333-8333-333333333333',
        empresaId: user.empresaId,
      },
    });
    expect(storageMock.save).not.toHaveBeenCalled();
  });

  it('bloquea crear documentos en una orden terminal', async () => {
    reparacionesRepositoryMock.findOne.mockResolvedValue({ estado: 'cerrada' });
    await expect(
      service.create(
        {
          entidadRelacionada: 'reparaciones_activo',
          entidadRelacionadaId: '33333333-3333-4333-8333-333333333333',
        },
        {
          originalname: 'diagnostico.pdf',
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('ok'),
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageMock.save).not.toHaveBeenCalled();
  });

  it('exige permiso especializado para documentos de taller', async () => {
    permissionsMock.requireAny.mockRejectedValue(
      new BadRequestException('permiso insuficiente'),
    );
    await expect(
      service.create(
        {
          entidadRelacionada: 'reparaciones_activo',
          entidadRelacionadaId: '33333333-3333-4333-8333-333333333333',
        },
        {
          originalname: 'diagnostico.pdf',
          mimetype: 'application/pdf',
          size: 100,
          buffer: Buffer.from('ok'),
        },
        user,
      ),
    ).rejects.toThrow('permiso insuficiente');
    expect(reparacionesRepositoryMock.findOne).not.toHaveBeenCalled();
    expect(storageMock.save).not.toHaveBeenCalled();
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

  it.each(['cerrada', 'cancelada'])(
    'bloquea eliminar documentos de una orden %s',
    async (estado) => {
      documentsRepositoryMock.findOne.mockResolvedValue({
        id: 'doc-1',
        empresaId: user.empresaId,
        entidadRelacionada: 'reparaciones_activo',
        entidadRelacionadaId: '33333333-3333-4333-8333-333333333333',
        storagePath: '2026/09/doc.pdf',
      });
      reparacionesRepositoryMock.findOne.mockResolvedValue({ estado });

      await expect(service.remove('doc-1', user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(storageMock.exists).not.toHaveBeenCalled();
      expect(documentsRepositoryMock.delete).not.toHaveBeenCalled();
    },
  );

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
