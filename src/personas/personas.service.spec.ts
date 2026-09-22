import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { PersonasService } from './personas.service';
import { Persona } from './entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { EjecucionesCargaEmpleado } from '../ejecuciones-carga-empleados/entities/ejecuciones-carga-empleado.entity';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { PersonaEstructuraOrganizacional } from '../persona-estructura-organizacional/entities/persona-estructura-organizacional.entity';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { SecretsService } from '../common/security/secrets.service';
import { EventosPersonaLaboral } from '../eventos-persona-laboral/entities/eventos-persona-laboral.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

describe('PersonasService', () => {
  let service: PersonasService;
  const personasRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const fuentesRepositoryMock = { findOne: jest.fn(), createQueryBuilder: jest.fn() };
  const ejecucionesRepositoryMock = { create: jest.fn(), save: jest.fn(), merge: jest.fn() };
  const estructuraNodosRepositoryMock = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const personaEstructuraRepositoryMock = { findOne: jest.fn(), create: jest.fn(), save: jest.fn() };
  const eventosLaboralesRepositoryMock = { find: jest.fn() };
  const asignacionesRepositoryMock = { find: jest.fn() };
  const asignacionRecursosRepositoryMock = { find: jest.fn() };
  const secureHttpClientMock = { request: jest.fn(), extractHostname: jest.fn() };
  const secretsServiceMock = { decryptString: jest.fn() };
  const dataSourceMock = {
    transaction: jest.fn(async (work) =>
      work({
        getRepository: (entity) => {
          if (entity === Persona) return personasRepositoryMock;
          if (entity === EstructuraOrganizacionalNodo) return estructuraNodosRepositoryMock;
          if (entity === PersonaEstructuraOrganizacional) return personaEstructuraRepositoryMock;
          throw new Error('Repository mock not configured');
        },
      }),
    ),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonasService,
        {
          provide: getRepositoryToken(Persona),
          useValue: personasRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        {
          provide: getRepositoryToken(FuentesEmpleado),
          useValue: fuentesRepositoryMock,
        },
        {
          provide: getRepositoryToken(EjecucionesCargaEmpleado),
          useValue: ejecucionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(EstructuraOrganizacionalNodo),
          useValue: estructuraNodosRepositoryMock,
        },
        {
          provide: getRepositoryToken(PersonaEstructuraOrganizacional),
          useValue: personaEstructuraRepositoryMock,
        },
        {
          provide: getRepositoryToken(EventosPersonaLaboral),
          useValue: eventosLaboralesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: asignacionRecursosRepositoryMock,
        },
        {
          provide: SecureHttpClientService,
          useValue: secureHttpClientMock,
        },
        {
          provide: SecretsService,
          useValue: secretsServiceMock,
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
    jest.clearAllMocks();
    secretsServiceMock.decryptString.mockImplementation((value: string) =>
      value.replace('enc:', ''),
    );
  });

  it('debe crear persona y registrar bitacora', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };
    const dto = {
      codigoInterno: 'PER-001',
      nombres: 'Ana',
      apellidos: 'Perez',
      numeroDocumento: '00100000001',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    const created = {
      id: 'per-1',
      ...dto,
      tipoDocumento: 'cedula',
      estado: 'activo',
    };
    personasRepositoryMock.create.mockReturnValue(created);
    personasRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);
    expect(result).toMatchObject({ id: 'per-1', codigoInterno: 'PER-001' });
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
  });

  it('rechaza leer una persona de otro tenant', async () => {
    personasRepositoryMock.findOne.mockResolvedValue(undefined);
    await expect(
      service.findOne('per-tenant-b', {
        userId: 'user-a',
        empresaId: 'tenant-a',
      }),
    ).rejects.toThrow('no encontrada');
    expect(personasRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'per-tenant-b',
        empresaId: 'tenant-a',
        deletedAt: expect.anything(),
      },
    });
  });

  it('usa cliente HTTP seguro en importacion API', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: { endpointPersonas: '/empleados' },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'completada' });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[]',
      json: [],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    await service.importFromApi(
      {
        fuenteEmpleadosId: 'fuente-1',
        endpointPath: '/empleados',
      },
      user,
    );

    expect(secureHttpClientMock.extractHostname).toHaveBeenCalledWith(
      'https://api.empresa.test',
    );
    expect(secureHttpClientMock.request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://api.empresa.test/empleados',
        allowedHosts: ['api.empresa.test'],
        headers: expect.objectContaining({ Authorization: 'Bearer token-tenant' }),
      }),
    );
  });

  it('sincroniza tipoNodoId cuando viene en orgAssignments', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: { endpointPersonas: '/empleados' },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'completada' });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[{"codigoInterno":"EMP-100","nombres":"Ana","apellidos":"Perez","numeroDocumento":"00100000099","orgAssignments":[{"tipoNodo":"departamento","tipoNodoId":"aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa","nodoExternoId":"dep-ti","nombre":"TI"}]}]',
      json: [
        {
          codigoInterno: 'EMP-100',
          nombres: 'Ana',
          apellidos: 'Perez',
          numeroDocumento: '00100000099',
          orgAssignments: [
            {
              tipoNodo: 'departamento',
              tipoNodoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
              nodoExternoId: 'dep-ti',
              nombre: 'TI',
            },
          ],
        },
      ],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    personasRepositoryMock.findOne.mockResolvedValue(null);
    personasRepositoryMock.create.mockImplementation((value) => ({
      id: 'persona-1',
      ...value,
    }));
    personasRepositoryMock.save.mockImplementation(async (value) => value);

    estructuraNodosRepositoryMock.findOne.mockResolvedValue(null);
    estructuraNodosRepositoryMock.create.mockImplementation((value) => value);
    estructuraNodosRepositoryMock.save.mockImplementation(async (value) => ({
      id: value.id ?? 'node-1',
      ...value,
    }));

    personaEstructuraRepositoryMock.findOne.mockResolvedValue(null);
    personaEstructuraRepositoryMock.create.mockImplementation((value) => value);
    personaEstructuraRepositoryMock.save.mockResolvedValue({ id: 'pe-1' });

    await service.importFromApi(
      {
        fuenteEmpleadosId: 'fuente-1',
        endpointPath: '/empleados',
      },
      user,
    );

    expect(dataSourceMock.transaction).toHaveBeenCalled();
    expect(estructuraNodosRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoNodo: 'departamento',
        tipoNodoId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      }),
    );
  });

  it('transforma jerarquia_por_campos a orgAssignments interno', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: {
          endpointPersonas: '/empleados',
          structureMode: 'jerarquia_por_campos',
          structureTemplateLevels: [
            { tipoNodo: 'direccion', sourceField: 'direccion', required: true },
            {
              tipoNodo: 'departamento',
              sourceField: 'departamento',
              required: true,
            },
            { tipoNodo: 'seccion', sourceField: 'seccion', required: false },
          ],
        },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'completada' });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[{"codigoInterno":"EMP-200","nombres":"Luis","apellidos":"Gomez","numeroDocumento":"00100000200","direccion":"Administrativa","departamento":"Compras","seccion":"Licitaciones"}]',
      json: [
        {
          codigoInterno: 'EMP-200',
          nombres: 'Luis',
          apellidos: 'Gomez',
          numeroDocumento: '00100000200',
          direccion: 'Administrativa',
          departamento: 'Compras',
          seccion: 'Licitaciones',
        },
      ],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    personasRepositoryMock.findOne.mockResolvedValue(null);
    personasRepositoryMock.create.mockImplementation((value) => ({
      id: 'persona-1',
      ...value,
    }));
    personasRepositoryMock.save.mockImplementation(async (value) => value);

    estructuraNodosRepositoryMock.findOne.mockResolvedValue(null);
    estructuraNodosRepositoryMock.create.mockImplementation((value) => value);
    estructuraNodosRepositoryMock.save.mockImplementation(async (value) => ({
      id: value.id ?? `${value.tipoNodo}-id`,
      ...value,
    }));

    personaEstructuraRepositoryMock.findOne.mockResolvedValue(null);
    personaEstructuraRepositoryMock.create.mockImplementation((value) => value);
    personaEstructuraRepositoryMock.save.mockResolvedValue({ id: 'pe-1' });

    await service.importFromApi(
      {
        fuenteEmpleadosId: 'fuente-1',
        endpointPath: '/empleados',
      },
      user,
    );

    const createdTypes = estructuraNodosRepositoryMock.create.mock.calls.map(
      (call) => call[0]?.tipoNodo,
    );
    expect(createdTypes).toEqual(
      expect.arrayContaining(['direccion', 'departamento', 'seccion']),
    );
  });

  it('rechaza jerarquia_por_campos cuando falta nivel intermedio', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: {
          endpointPersonas: '/empleados',
          structureMode: 'jerarquia_por_campos',
          structureTemplateLevels: [
            { tipoNodo: 'direccion', sourceField: 'direccion', required: true },
            {
              tipoNodo: 'departamento',
              sourceField: 'departamento',
              required: true,
            },
            { tipoNodo: 'seccion', sourceField: 'seccion', required: false },
          ],
        },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'fallida' });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[{"codigoInterno":"EMP-201","nombres":"Maria","apellidos":"Lopez","numeroDocumento":"00100000201","direccion":"Administrativa","seccion":"Licitaciones"}]',
      json: [
        {
          codigoInterno: 'EMP-201',
          nombres: 'Maria',
          apellidos: 'Lopez',
          numeroDocumento: '00100000201',
          direccion: 'Administrativa',
          seccion: 'Licitaciones',
        },
      ],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    await expect(
      service.importFromApi(
        {
          fuenteEmpleadosId: 'fuente-1',
          endpointPath: '/empleados',
        },
        user,
      ),
    ).rejects.toThrow('falta el campo requerido');
  });

  it('debe contar error si falla transaccion por item durante importacion', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: { endpointPersonas: '/empleados' },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'fallida', errores: 1 });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[{"codigoInterno":"EMP-500","nombres":"Error","apellidos":"Prueba","numeroDocumento":"00100000500"}]',
      json: [
        {
          codigoInterno: 'EMP-500',
          nombres: 'Error',
          apellidos: 'Prueba',
          numeroDocumento: '00100000500',
        },
      ],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    dataSourceMock.transaction.mockRejectedValueOnce(new Error('tx fail'));

    const result = await service.importFromApi(
      {
        fuenteEmpleadosId: 'fuente-1',
        endpointPath: '/empleados',
      },
      user,
    );

    expect(result.resumen.errores).toBe(1);
    expect(result.resumen.creados).toBe(0);
  });

  it('usa identificador externo por fuente para evitar duplicados por cambios de documento', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    fuentesRepositoryMock.createQueryBuilder.mockReturnValue({
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue({
        id: 'fuente-1',
        empresaId: user.empresaId,
        tipoFuente: 'api_rest',
        nombre: 'Nomina',
        estado: 'activa',
        urlBase: 'https://api.empresa.test',
        metodoAutenticacion: 'bearer',
        secretoCifrado: 'enc:token-tenant',
        mapeoCampos: {
          endpointPersonas: '/empleados',
          uniqueIdentifier: 'idExterno',
        },
      }),
    });
    ejecucionesRepositoryMock.create.mockImplementation((value) => ({
      id: 'ejec-1',
      ...value,
    }));
    ejecucionesRepositoryMock.merge.mockImplementation((entity, patch) => ({
      ...entity,
      ...patch,
    }));
    ejecucionesRepositoryMock.save
      .mockResolvedValueOnce({ id: 'ejec-1' })
      .mockResolvedValueOnce({ id: 'ejec-1', estado: 'completada' });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });
    secureHttpClientMock.extractHostname.mockReturnValue('api.empresa.test');
    secureHttpClientMock.request.mockResolvedValue({
      ok: true,
      status: 200,
      responseTimeMs: 10,
      text: '[{"idExterno":"ext-1","codigoInterno":"EMP-100","nombres":"Ana","apellidos":"Perez","numeroDocumento":"00100000011"}]',
      json: [
        {
          idExterno: 'ext-1',
          codigoInterno: 'EMP-100',
          nombres: 'Ana',
          apellidos: 'Perez',
          numeroDocumento: '00100000011',
        },
      ],
      jsonValid: true,
      finalUrl: 'https://api.empresa.test/empleados',
    });

    personasRepositoryMock.findOne.mockResolvedValue({
      id: 'persona-1',
      empresaId: user.empresaId,
      codigoInterno: 'EMP-100',
      nombres: 'Ana',
      apellidos: 'Perez',
      tipoDocumento: 'cedula',
      numeroDocumento: '00100000099',
      identificadorExterno: 'ext-1',
      fuenteEmpleadosId: 'fuente-1',
      origenRegistro: 'integracion',
      estado: 'activo',
      deletedAt: undefined,
    });
    personasRepositoryMock.save.mockImplementation(async (value) => value);
    estructuraNodosRepositoryMock.findOne.mockResolvedValue(null);
    personaEstructuraRepositoryMock.findOne.mockResolvedValue(null);

    const result = await service.importFromApi(
      {
        fuenteEmpleadosId: 'fuente-1',
        endpointPath: '/empleados',
      },
      user,
    );

    expect(personasRepositoryMock.findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.arrayContaining([
          expect.objectContaining({
            empresaId: user.empresaId,
            fuenteEmpleadosId: 'fuente-1',
            identificadorExterno: 'ext-1',
          }),
        ]),
      }),
    );
    expect(personasRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        identificadorExterno: 'ext-1',
        fuenteEmpleadosId: 'fuente-1',
        origenRegistro: 'integracion',
        numeroDocumento: '00100000011',
      }),
    );
    expect(result.resumen.actualizados).toBe(1);
  });

  it('construye pendientes de regularizacion para salidas detectadas con recursos activos', async () => {
    const user = {
      userId: '22222222-2222-2222-2222-222222222222',
      empresaId: '11111111-1111-1111-1111-111111111111',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId });
    eventosLaboralesRepositoryMock.find.mockResolvedValue([
      {
        id: 'evt-1',
        personaId: 'persona-1',
        detectadoEn: new Date('2026-09-19T00:00:00.000Z'),
        tipoEvento: 'salida_detectada',
      },
    ]);
    asignacionesRepositoryMock.find.mockResolvedValue([
      {
        id: 'asg-1',
        personaId: 'persona-1',
        estado: 'entregada',
        fechaAsignacion: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]);
    asignacionRecursosRepositoryMock.find.mockResolvedValue([
      {
        id: 'ar-1',
        asignacionId: 'asg-1',
        tipoRecurso: 'activo',
        activoId: 'activo-1',
        lineaTelefonicaId: undefined,
      },
    ]);
    personasRepositoryMock.find.mockResolvedValue([
      {
        id: 'persona-1',
        codigoInterno: 'EMP-001',
        nombres: 'Ana',
        apellidos: 'Perez',
      },
    ]);

    const result = await service.getRegularizacionPendientes(user);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      personaId: 'persona-1',
      personaCodigoInterno: 'EMP-001',
      asignacionId: 'asg-1',
      salidaEventoId: 'evt-1',
      recursosActivos: [
        {
          id: 'ar-1',
          tipoRecurso: 'activo',
          activoId: 'activo-1',
        },
      ],
    });
  });
});
