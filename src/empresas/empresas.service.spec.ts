import { Test, TestingModule } from '@nestjs/testing';
import { EmpresasService } from './empresas.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Empresa } from './entities/empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Repository } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Rol } from '../roles/entities/role.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';

describe('EmpresasService', () => {
  let service: EmpresasService;
  let repository: jest.Mocked<Repository<Empresa>>;

  const repositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const bitacoraRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(),
  };
  const genericRepositoryMock = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'generated-id', ...value })),
    find: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmpresasService,
        {
          provide: getRepositoryToken(Empresa),
          useValue: repositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: getRepositoryToken(Usuario), useValue: genericRepositoryMock },
        { provide: getRepositoryToken(Rol), useValue: genericRepositoryMock },
        { provide: getRepositoryToken(Permiso), useValue: genericRepositoryMock },
        { provide: getRepositoryToken(RolPermiso), useValue: genericRepositoryMock },
        { provide: getRepositoryToken(UsuarioRol), useValue: genericRepositoryMock },
      ],
    }).compile();

    service = module.get<EmpresasService>(EmpresasService);
    repository = module.get(getRepositoryToken(Empresa));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear empresa con defaults', async () => {
    const dto = {
      codigo: 'EMP-001',
      nombreLegal: 'Empresa Uno SRL',
      codigoPais: 'DO',
      tipoIdentificacionFiscal: 'RNC',
      numeroIdentificacionFiscal: '101010101',
      adminCorreo: 'admin@empresa.test',
      adminNombres: 'Admin',
      adminApellidos: 'Tenant',
      adminContrasena: 'temporary-password',
    };

    const created = {
      id: '1',
      ...dto,
      moneda: 'DOP',
      zonaHoraria: 'America/Santo_Domingo',
      estado: 'activa',
      estaActiva: true,
    };
    repository.create.mockReturnValue(created as unknown as Empresa);
    repository.save.mockResolvedValueOnce(created as Empresa);

    const actor = {
      userId: 'owner-1',
      empresaId: 'empresa-actor',
      correo: 'owner@test.local',
    };

    const result = await service.create(dto, actor);

    expect(repository.create).toHaveBeenCalled();
    expect(repository.save).toHaveBeenCalledWith(created);
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(result).toMatchObject({ id: '1', codigo: 'EMP-001' });
  });

  it('bloquea desactivar la empresa del actor', async () => {
    await expect(
      service.remove('empresa-actor', {
        userId: 'owner-1',
        empresaId: 'empresa-actor',
        correo: 'owner@test.local',
      }),
    ).rejects.toThrow('No se puede desactivar la empresa del actor autenticado');
  });
});
