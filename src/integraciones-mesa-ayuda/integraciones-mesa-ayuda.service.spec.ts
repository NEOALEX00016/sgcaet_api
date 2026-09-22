import { IntegracionesMesaAyudaService } from './integraciones-mesa-ayuda.service';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-1' }),
  })),
}));

describe('IntegracionesMesaAyudaService', () => {
  const integrationsRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const eventsRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };
  const bitacoraRepository = {
    create: jest.fn(),
    save: jest.fn(),
  };
  const secureHttpClientMock = {
    request: jest.fn(),
    extractHostname: jest.fn(),
  };
  const secretsServiceMock = {
    encryptString: jest.fn((value: string) => `enc:v1:iv:tag:${Buffer.from(value).toString('base64')}`),
    decryptString: jest.fn((value: string) => {
      const parts = value.split(':');
      if (parts.length === 5) {
        return Buffer.from(parts[4], 'base64').toString('utf8');
      }
      return value;
    }),
  };
  const configuracionTenantServiceMock = {
    getCorreoDeliveryConfig: jest.fn(),
  };
  const service = new IntegracionesMesaAyudaService(
    integrationsRepository as never,
    eventsRepository as never,
    {} as never,
    bitacoraRepository as never,
    secureHttpClientMock as unknown as SecureHttpClientService,
    secretsServiceMock as never,
    configuracionTenantServiceMock as never,
  );
  const solicitudesRepositoryMock = {
    findOne: jest.fn(),
  };

  (service as unknown as { solicitudesRepository: typeof solicitudesRepositoryMock }).solicitudesRepository =
    solicitudesRepositoryMock;

  beforeEach(() => jest.clearAllMocks());

  it('scopes creation to the authenticated tenant and hides encrypted auth data', async () => {
    const entity = {
      id: 'integration-1',
      empresaId: 'company-1',
      nombre: 'Helpdesk',
      authConfigCifrada: 'secret',
    };
    integrationsRepository.create.mockReturnValue(entity);
    integrationsRepository.save.mockResolvedValue(entity);

    const result = await service.create(
      { nombre: 'Helpdesk', tipo: 'api' },
      { userId: 'user-1', empresaId: 'company-1', correo: 'user@example.com' },
    );

    expect(integrationsRepository.create).toHaveBeenCalledWith({
      nombre: 'Helpdesk',
      tipo: 'api',
      empresaId: 'company-1',
    });
    expect(result).not.toHaveProperty('authConfigCifrada');
  });

  it('moves sensitive API headers into encrypted auth config', async () => {
    const entity = {
      id: 'integration-2',
      empresaId: 'company-1',
      nombre: 'Helpdesk API',
      tipo: 'api',
      headersJson: { 'x-client': 'sgcaet' },
      authConfigCifrada: 'enc:v1:iv:tag:e30=',
    };
    integrationsRepository.create.mockImplementation((value) => value);
    integrationsRepository.save.mockResolvedValue(entity);

    await service.create(
      {
        nombre: 'Helpdesk API',
        tipo: 'api',
        headersJson: {
          Authorization: 'Bearer secret-token',
          'x-client': 'sgcaet',
        },
      },
      { userId: 'user-1', empresaId: 'company-1', correo: 'user@example.com' },
    );

    expect(integrationsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: 'company-1',
        headersJson: { 'x-client': 'sgcaet' },
      }),
    );
    expect(secretsServiceMock.encryptString).toHaveBeenCalled();
  });

  it('filters list and events by the requested tenant', async () => {
    const item = {
      id: 'integration-1',
      empresaId: 'company-1',
      nombre: 'Helpdesk',
    };
    integrationsRepository.find.mockResolvedValue([item]);
    eventsRepository.find.mockResolvedValue([
      { id: 'event-1', empresaId: 'company-1' },
    ]);

    await service.findAll('company-1');
    await service.findEvents('company-1');

    expect(integrationsRepository.find).toHaveBeenCalledWith({
      where: { empresaId: 'company-1' },
      order: { createdAt: 'DESC' },
    });
    expect(eventsRepository.find).toHaveBeenCalledWith({
      where: { empresaId: 'company-1' },
      order: { createdAt: 'DESC' },
    });
  });

  it('rejects access to an integration from another tenant', async () => {
    integrationsRepository.findOne.mockResolvedValue(null);

    await expect(service.findOne('integration-1', 'company-2')).rejects.toThrow(
      'Integración no encontrada',
    );
    expect(integrationsRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'integration-1', empresaId: 'company-2' },
    });
  });

  it('uses secure outbound client and records errors when outbound call is blocked', async () => {
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'integration-1',
          empresaId: 'company-1',
          tipo: 'api',
          activo: true,
          baseUrl: 'https://api.helpdesk.test',
          endpointSolicitud: '/tickets',
          headersJson: {},
          authConfigCifrada: undefined,
        },
      ]),
    });
    integrationsRepository.find.mockResolvedValue([
      {
        id: 'integration-1',
        empresaId: 'company-1',
        tipo: 'api',
        activo: true,
        baseUrl: 'https://api.helpdesk.test',
        endpointSolicitud: '/tickets',
        headersJson: {},
      },
    ]);
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.findOne.mockResolvedValue(null);
    eventsRepository.save
      .mockResolvedValueOnce({
        id: 'event-1',
        empresaId: 'company-1',
        estado: 'pendiente',
      })
      .mockResolvedValueOnce({
        id: 'event-1',
        empresaId: 'company-1',
        estado: 'error',
      });
    secureHttpClientMock.extractHostname.mockReturnValue('api.helpdesk.test');
    secureHttpClientMock.request.mockRejectedValue(
      new Error('Host externo no permitido por allowlist'),
    );

    await service.dispatchForSolicitud({
      id: 'req-1',
      empresaId: 'company-1',
      referenciaExterna: null,
      tipoSolicitud: 'asignacion',
      recursoTipo: 'activo',
      cantidad: 1,
      unidad: 'unidad',
      desdeEn: null,
      hastaEn: null,
      motivo: 'Prueba',
    } as never);

    expect(secureHttpClientMock.extractHostname).toHaveBeenCalledWith(
      'https://api.helpdesk.test',
    );
    expect(secureHttpClientMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.helpdesk.test/tickets',
        allowedHosts: ['api.helpdesk.test'],
      }),
    );
    expect(eventsRepository.save).toHaveBeenLastCalledWith(
      expect.objectContaining({
        estado: 'error',
        ultimoError: expect.stringContaining('allowlist'),
      }),
    );
  });

  it('sends email integrations using tenant SMTP config instead of global env SMTP', async () => {
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'integration-email-1',
          empresaId: 'company-1',
          tipo: 'email',
          activo: true,
          emailDestino: 'mesaayuda@company.test',
        },
      ]),
    });
    eventsRepository.create.mockImplementation((value) => value);
    eventsRepository.findOne.mockResolvedValue(null);
    eventsRepository.save
      .mockResolvedValueOnce({
        id: 'event-email-1',
        empresaId: 'company-1',
        estado: 'pendiente',
      })
      .mockResolvedValueOnce({
        id: 'event-email-1',
        empresaId: 'company-1',
        estado: 'enviado',
      });
    configuracionTenantServiceMock.getCorreoDeliveryConfig.mockResolvedValue({
      mode: 'smtp',
      host: 'smtp.company.test',
      port: 587,
      user: 'tenant-user',
      pass: 'tenant-pass',
      from: 'notificaciones@company.test',
      tls: true,
    });

    await service.dispatchForSolicitud({
      id: 'req-mail-1',
      empresaId: 'company-1',
      referenciaExterna: null,
      tipoSolicitud: 'asignacion',
      recursoTipo: 'activo',
      cantidad: 1,
      unidad: 'unidad',
      desdeEn: null,
      hastaEn: null,
      motivo: 'Prueba correo tenant',
    } as never);

    expect(configuracionTenantServiceMock.getCorreoDeliveryConfig).toHaveBeenCalledWith(
      'company-1',
    );
    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.company.test',
        port: 587,
        auth: { user: 'tenant-user', pass: 'tenant-pass' },
      }),
    );
  });

  it('evita duplicar dispatch si el evento idempotente ya fue enviado', async () => {
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: 'integration-api-2',
          empresaId: 'company-1',
          tipo: 'api',
          activo: true,
          baseUrl: 'https://api.helpdesk.test',
          endpointSolicitud: '/tickets',
          headersJson: {},
          authConfigCifrada: undefined,
        },
      ]),
    });
    eventsRepository.findOne.mockResolvedValue({
      id: 'evt-previo-1',
      estado: 'enviado',
    });

    await service.dispatchForSolicitud({
      id: 'req-idem-1',
      empresaId: 'company-1',
      referenciaExterna: null,
      tipoSolicitud: 'asignacion',
      recursoTipo: 'activo',
      cantidad: 1,
      unidad: 'unidad',
      desdeEn: null,
      hastaEn: null,
      motivo: 'idempotencia',
    } as never);

    expect(secureHttpClientMock.request).not.toHaveBeenCalled();
    expect(eventsRepository.create).not.toHaveBeenCalled();
  });

  it('rejects activation of email integration when tenant mail provider is not SMTP', async () => {
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'integration-email-2',
        empresaId: 'company-1',
        tipo: 'email',
        activo: false,
        emailDestino: 'mesaayuda@company.test',
      }),
    });
    integrationsRepository.merge.mockImplementation((a, b) => ({ ...a, ...b }));
    configuracionTenantServiceMock.getCorreoDeliveryConfig.mockResolvedValue({
      mode: 'api_key',
      provider: 'resend',
      endpoint: 'https://api.resend.com/emails',
    });

    await expect(
      service.update(
        'integration-email-2',
        { activo: true },
        'company-1',
      ),
    ).rejects.toThrow('Integracion email requiere proveedor SMTP');
  });

  it('runs integration probe and persists last probe status', async () => {
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'integration-api-1',
        empresaId: 'company-1',
        tipo: 'api',
        baseUrl: 'https://api.helpdesk.test',
        endpointSolicitud: '/tickets',
        headersJson: {},
      }),
    });
    integrationsRepository.save.mockImplementation(async (value) => value);
    secureHttpClientMock.extractHostname.mockReturnValue('api.helpdesk.test');
    secureHttpClientMock.request.mockResolvedValue({ ok: true, status: 200 });

    const result = await service.probarIntegracion('integration-api-1', {
      userId: 'actor-1',
      empresaId: 'company-1',
      correo: 'actor@company.test',
    });

    expect(result.ok).toBe(true);
    expect(integrationsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'integration-api-1',
        ultimaPruebaEstado: 'ok',
        ultimaPruebaActorId: 'actor-1',
      }),
    );
  });

  it('permite retry manual auditado de evento de integración', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'evt-retry-1',
      empresaId: 'company-1',
      solicitudId: 'req-retry-1',
      integracionId: 'integration-api-1',
      estado: 'error',
      intentos: 1,
    });
    integrationsRepository.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'integration-api-1',
        empresaId: 'company-1',
        tipo: 'api',
        activo: true,
        baseUrl: 'https://api.helpdesk.test',
        endpointSolicitud: '/tickets',
        headersJson: {},
      }),
    });
    secureHttpClientMock.extractHostname.mockReturnValue('api.helpdesk.test');
    secureHttpClientMock.request.mockResolvedValue({ ok: true, status: 200, jsonValid: true, json: {} });
    solicitudesRepositoryMock.findOne.mockResolvedValue({
        id: 'req-retry-1',
        empresaId: 'company-1',
        tipoSolicitud: 'asignacion',
        recursoTipo: 'activo',
      });
    eventsRepository.save.mockImplementation(async (value) => value);
    bitacoraRepository.create.mockImplementation((value) => value);
    bitacoraRepository.save.mockResolvedValue(undefined);

    const result = await service.retryEventById('evt-retry-1', {
      userId: 'actor-1',
      empresaId: 'company-1',
      correo: 'actor@company.test',
    });

    expect(result).toMatchObject({ ok: true, id: 'evt-retry-1', estado: 'enviado' });
    expect(bitacoraRepository.save).toHaveBeenCalled();
  });

  it('rechaza retry manual si el evento no está en error', async () => {
    eventsRepository.findOne.mockResolvedValue({
      id: 'evt-retry-2',
      empresaId: 'company-1',
      estado: 'enviado',
    });

    await expect(
      service.retryEventById('evt-retry-2', {
        userId: 'actor-1',
        empresaId: 'company-1',
        correo: 'actor@company.test',
      }),
    ).rejects.toThrow('Solo se permite retry manual de eventos en estado error');
  });
});
