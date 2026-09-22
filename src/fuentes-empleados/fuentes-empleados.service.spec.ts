import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FuentesEmpleadosService } from './fuentes-empleados.service';
import { FuentesEmpleado } from './entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { SecretsService } from '../common/security/secrets.service';
import { BadRequestException } from '@nestjs/common';

describe('FuentesEmpleadosService', () => {
  let service: FuentesEmpleadosService;

  const makeRepo = () => ({
    findOne: jest.fn(),
    find: jest.fn(),
    save: jest.fn(async (value) => value),
    create: jest.fn((value) => value),
    merge: jest.fn((a, b) => ({ ...a, ...b })),
    createQueryBuilder: jest.fn(),
  });

  const fuentesRepo = makeRepo();
  const usuariosRepo = makeRepo();
  const bitacoraRepo = makeRepo();
  const secureHttpClient = {
    extractHostname: jest.fn(),
    request: jest.fn(),
  };
  const secretsService = {
    encryptString: jest.fn((value: string) => `enc:${value}`),
    decryptString: jest.fn((value: string) => value.replace('enc:', '')),
  };

  const user = {
    userId: 'u-1',
    empresaId: 'e-1',
    correo: 'admin@tenant.test',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FuentesEmpleadosService,
        { provide: getRepositoryToken(FuentesEmpleado), useValue: fuentesRepo },
        { provide: getRepositoryToken(Usuario), useValue: usuariosRepo },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepo,
        },
        { provide: SecureHttpClientService, useValue: secureHttpClient },
        { provide: SecretsService, useValue: secretsService },
      ],
    }).compile();

    service = module.get<FuentesEmpleadosService>(FuentesEmpleadosService);

    [fuentesRepo, usuariosRepo, bitacoraRepo, secureHttpClient, secretsService].forEach(
      (mockObj) =>
        Object.values(mockObj).forEach((fn) => {
          if (typeof fn === 'function' && 'mockClear' in fn) fn.mockClear();
        }),
    );

    usuariosRepo.findOne.mockResolvedValue({ id: 'u-1', empresaId: 'e-1' });
  });

  it('crea fuente y sanitiza secretos en respuesta', async () => {
    fuentesRepo.save.mockImplementation(async (value) => ({
      id: 'f-1',
      empresaId: user.empresaId,
      ...value,
    }));

    const created = await service.create(
      {
        nombre: 'Fuente RRHH',
        tipoFuente: 'api_rest',
        urlBase: 'https://rrhh.tenant.test',
        mapeoCampos: {
          endpointPersonas: '/personas',
          apiKey: 'secret-api-key',
        },
      },
      user as never,
    );

    expect(secretsService.encryptString).toHaveBeenCalledWith('secret-api-key');
    expect(created.secretoConfigurado).toBe(true);
    expect(created.secretoCifrado).toBeUndefined();
    expect((created.mapeoCampos as Record<string, unknown>).apiKey).toBe(
      '************',
    );
  });

  it('lista fuentes del tenant sin exponer secreto cifrado', async () => {
    fuentesRepo.find.mockResolvedValue([
      {
        id: 'f-1',
        empresaId: user.empresaId,
        nombre: 'Fuente API',
        tipoFuente: 'api_rest',
        estado: 'activa',
        mapeoCampos: { bearerToken: 'opaque' },
        secretoCifrado: 'enc:opaque',
      },
    ]);

    const result = await service.findAll(user.empresaId);

    expect(result).toHaveLength(1);
    expect(result[0].secretoCifrado).toBeUndefined();
    expect(result[0].secretoConfigurado).toBe(true);
    expect((result[0].mapeoCampos as Record<string, unknown>).bearerToken).toBe(
      '************',
    );
  });

  it('incrementa version de mapeo al actualizar', async () => {
    fuentesRepo.findOne.mockResolvedValue({
      id: 'f-1',
      empresaId: user.empresaId,
      nombre: 'Fuente API',
      tipoFuente: 'api_rest',
      mapeoCampos: {
        endpointPersonas: '/personas',
        _meta: { version: 2, updatedAt: '2026-01-01T00:00:00.000Z' },
      },
    });
    fuentesRepo.save.mockImplementation(async (value) => value);

    const updated = await service.update(
      'f-1',
      {
        tipoFuente: 'api_rest',
        mapeoCampos: { endpointPersonas: '/empleados' },
      },
      user as never,
    );

    const meta = (updated.mapeoCampos as Record<string, unknown>)._meta as Record<
      string,
      unknown
    >;
    expect(meta.version).toBe(3);
    expect(typeof meta.updatedAt).toBe('string');
  });

  it('rechaza api_rest sin endpointPersonas en mapeo', async () => {
    await expect(
      service.create(
        {
          nombre: 'Fuente API',
          tipoFuente: 'api_rest',
          mapeoCampos: {},
        },
        user as never,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
