import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { BitacoraAuditoriaSistema } from '../src/bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { DocumentsController } from '../src/documents/documents.controller';
import { DocumentsService } from '../src/documents/documents.service';
import { DocumentEntity } from '../src/documents/entities/document.entity';
import { DOCUMENT_STORAGE } from '../src/documents/interfaces/document-storage.interface';
import { ReparacionActivo } from '../src/reparaciones-activo/entities/reparaciones-activo.entity';
import { Usuario } from '../src/usuarios/entities/usuario.entity';
import { PermissionsEvaluatorService } from '../src/auth/permissions-evaluator.service';

describe('Workshop document ownership API contract', () => {
  let app: INestApplication;
  const user = {
    userId: '22222222-2222-4222-8222-222222222222',
    empresaId: '11111111-1111-4111-8111-111111111111',
    correo: 'workshop@example.com',
  };
  const documentsRepository = { findOne: jest.fn() };
  const repairsRepository = { findOne: jest.fn() };
  const usersRepository = {
    findOne: jest.fn().mockResolvedValue({ id: user.userId }),
  };
  const storage = {
    save: jest.fn(),
    read: jest.fn(),
    remove: jest.fn(),
    exists: jest.fn(),
  };
  const permissions = { requireAny: jest.fn().mockResolvedValue(undefined) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: documentsRepository,
        },
        { provide: getRepositoryToken(BitacoraAuditoriaSistema), useValue: {} },
        { provide: getRepositoryToken(Usuario), useValue: usersRepository },
        {
          provide: getRepositoryToken(ReparacionActivo),
          useValue: repairsRepository,
        },
        { provide: DOCUMENT_STORAGE, useValue: storage },
        {
          provide: ConfigService,
          useValue: { get: (_key: string, fallback: string) => fallback },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: PermissionsEvaluatorService, useValue: permissions },
      ],
    }).compile();

    app = module.createNestApplication();
    app.use((req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: typeof user }).user = user;
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    permissions.requireAny.mockResolvedValue(undefined);
  });

  it('rejects a cross-tenant repair relation before persisting the upload', async () => {
    repairsRepository.findOne.mockResolvedValue(null);

    await request(app.getHttpServer())
      .post('/documents')
      .field('entidadRelacionada', 'reparaciones_activo')
      .field('entidadRelacionadaId', '33333333-3333-4333-8333-333333333333')
      .attach('file', Buffer.from('%PDF synthetic'), {
        filename: 'diagnostico.pdf',
        contentType: 'application/pdf',
      })
      .expect(404);

    expect(repairsRepository.findOne).toHaveBeenCalledWith({
      where: {
        id: '33333333-3333-4333-8333-333333333333',
        empresaId: user.empresaId,
      },
    });
    expect(storage.save).not.toHaveBeenCalled();
  });
});
