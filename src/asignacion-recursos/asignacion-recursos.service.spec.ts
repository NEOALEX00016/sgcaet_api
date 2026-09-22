import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AsignacionRecursosService } from './asignacion-recursos.service';
import { AsignacionRecurso } from './entities/asignacion-recurso.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { UsuarioRol } from '../usuario-roles/entities/usuario-role.entity';
import { RolPermiso } from '../rol-permisos/entities/rol-permiso.entity';
import { Permiso } from '../permisos/entities/permiso.entity';
import { ReparacionActivo } from '../reparaciones-activo/entities/reparaciones-activo.entity';

describe('AsignacionRecursosService', () => {
  let service: AsignacionRecursosService;
  const user = {
    userId: '44444444-4444-4444-4444-444444444444',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'test@example.com',
  };
  const asignacionRecursosRepositoryMock = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    merge: jest.fn(),
  };
  const asignacionesRepositoryMock = { findOne: jest.fn() };
  const activosRepositoryMock = { findOne: jest.fn(), save: jest.fn() };
  const lineasRepositoryMock = { findOne: jest.fn() };
  const suscripcionesRepositoryMock = { findOne: jest.fn() };
  const usuariosRepositoryMock = { findOne: jest.fn() };
  const bitacoraRepositoryMock = { create: jest.fn(), save: jest.fn() };
  const usuarioRolesRepositoryMock = { find: jest.fn() };
  const rolPermisosRepositoryMock = { find: jest.fn() };
  const permisosRepositoryMock = { findOne: jest.fn() };
  const reparacionesRepositoryMock = { findOne: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsignacionRecursosService,
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: asignacionRecursosRepositoryMock,
        },
        {
          provide: getRepositoryToken(Asignacion),
          useValue: asignacionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: activosRepositoryMock,
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: lineasRepositoryMock,
        },
        {
          provide: getRepositoryToken(SuscripcionesLinea),
          useValue: suscripcionesRepositoryMock,
        },
        {
          provide: getRepositoryToken(Usuario),
          useValue: usuariosRepositoryMock,
        },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraRepositoryMock,
        },
        { provide: getRepositoryToken(UsuarioRol), useValue: usuarioRolesRepositoryMock },
        { provide: getRepositoryToken(RolPermiso), useValue: rolPermisosRepositoryMock },
        { provide: getRepositoryToken(Permiso), useValue: permisosRepositoryMock },
        { provide: getRepositoryToken(ReparacionActivo), useValue: reparacionesRepositoryMock },
      ],
    }).compile();

    service = module.get<AsignacionRecursosService>(AsignacionRecursosService);
    jest.clearAllMocks();
    usuarioRolesRepositoryMock.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepositoryMock.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepositoryMock.findOne.mockResolvedValue({ codigo: 'inventario.asignaciones.gestionar' });
    reparacionesRepositoryMock.findOne.mockResolvedValue(null);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('debe crear asignacion de activo y registrar bitacora', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'activo',
      activoId: '33333333-3333-3333-3333-333333333333',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(null);

    const created = { id: 'res-1', ...dto, estaActivo: true };
    asignacionRecursosRepositoryMock.create.mockReturnValue(created);
    asignacionRecursosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(dto, user);

    expect(asignacionRecursosRepositoryMock.create).toHaveBeenCalled();
    expect(bitacoraRepositoryMock.save).toHaveBeenCalled();
    expect(activosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: dto.activoId, estado: 'asignado' }),
    );
    expect(result).toMatchObject({ id: 'res-1', tipoRecurso: 'activo' });
  });

  it('libera vinculo obsoleto cuando la asignacion anterior esta cancelada', async () => {
    const dto = {
      asignacionId: 'asignacion-nueva',
      tipoRecurso: 'activo',
      activoId: 'activo-liberado',
    };
    const staleResource = {
      id: 'recurso-anterior',
      asignacionId: 'asignacion-cancelada',
      activoId: dto.activoId,
      estaActivo: true,
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({ id: user.userId, empresaId: user.empresaId });
    asignacionesRepositoryMock.findOne
      .mockResolvedValueOnce({ id: dto.asignacionId, empresaId: user.empresaId, estado: 'borrador' })
      .mockResolvedValueOnce({ id: staleResource.asignacionId, empresaId: user.empresaId, estado: 'cancelada' });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(staleResource);
    activosRepositoryMock.findOne.mockResolvedValue({ id: dto.activoId, empresaId: user.empresaId });
    asignacionRecursosRepositoryMock.create.mockImplementation((value) => value);
    asignacionRecursosRepositoryMock.save
      .mockResolvedValueOnce({ ...staleResource, estaActivo: false })
      .mockResolvedValueOnce({ id: 'recurso-nuevo', ...dto, estaActivo: true });
    bitacoraRepositoryMock.create.mockImplementation((value) => value);
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-liberado' });

    const result = await service.create(dto, user);

    expect(asignacionRecursosRepositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: staleResource.id, estaActivo: false }),
    );
    expect(result).toMatchObject({ id: 'recurso-nuevo', activoId: dto.activoId });
  });

  it('debe rechazar si activo ya tiene asignacion activa', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'activo',
      activoId: '33333333-3333-3333-3333-333333333333',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValue({
      id: 'duplicado',
      activoId: dto.activoId,
      estaActivo: true,
    });

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('debe permitir vincular activo si la asignacion previa esta inactiva', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'activo',
      activoId: '33333333-3333-3333-3333-333333333333',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(null);
    activosRepositoryMock.findOne.mockResolvedValue({
      id: dto.activoId,
      empresaId: user.empresaId,
    });

    const created = { id: 'res-2', ...dto, estaActivo: true };
    asignacionRecursosRepositoryMock.create.mockReturnValue(created);
    asignacionRecursosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-2' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-2' });

    const result = await service.create(dto, user);

    expect(result).toMatchObject({ id: 'res-2', activoId: dto.activoId });
  });

  it('debe crear asignacion de linea solo con suscripcion activa vigente', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'linea',
      lineaTelefonicaId: 'linea-1',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(null);
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
      estado: 'registrada',
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue({
      id: 'sus-1',
      lineaTelefonicaId: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estado: 'activa',
      iniciaEn: new Date(Date.now() - 24 * 60 * 60 * 1000),
      venceEn: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    const created = { id: 'res-linea-1', ...dto, estaActivo: true };
    asignacionRecursosRepositoryMock.create.mockReturnValue(created);
    asignacionRecursosRepositoryMock.save.mockResolvedValue(created);
    bitacoraRepositoryMock.create.mockReturnValue({ id: 'bit-linea-1' });
    bitacoraRepositoryMock.save.mockResolvedValue({ id: 'bit-linea-1' });

    const result = await service.create(dto as any, user);

    expect(result).toMatchObject({
      id: 'res-linea-1',
      tipoRecurso: 'linea',
      lineaTelefonicaId: 'linea-1',
    });
  });

  it('rechaza vincular linea sin suscripcion activa vigente', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'linea',
      lineaTelefonicaId: 'linea-2',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(null);
    lineasRepositoryMock.findOne.mockResolvedValue({
      id: dto.lineaTelefonicaId,
      empresaId: user.empresaId,
      estaActiva: true,
      estado: 'registrada',
    });
    suscripcionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto as any, user)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rechaza FK cross-tenant cuando la asignacion no pertenece al tenant', async () => {
    const dto = {
      asignacionId: 'asig-tenant-b',
      tipoRecurso: 'activo',
      activoId: '33333333-3333-3333-3333-333333333333',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(asignacionesRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'asig-tenant-b',
        empresaId: user.empresaId,
      },
    });
  });

  it('rechaza FK cross-tenant cuando el activo no pertenece al tenant', async () => {
    const dto = {
      asignacionId: '22222222-2222-2222-2222-222222222222',
      tipoRecurso: 'activo',
      activoId: 'activo-tenant-b',
    };

    usuariosRepositoryMock.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
    });
    asignacionesRepositoryMock.findOne.mockResolvedValue({
      id: dto.asignacionId,
      empresaId: user.empresaId,
    });
    asignacionRecursosRepositoryMock.findOne.mockResolvedValueOnce(null);
    activosRepositoryMock.findOne.mockResolvedValue(null);

    await expect(service.create(dto, user)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(activosRepositoryMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'activo-tenant-b',
        empresaId: user.empresaId,
        deletedAt: expect.anything(),
      },
    });
  });
});
