import { BadRequestException } from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';

describe('SolicitudesService', () => {
  const solicitudesRepository = {
    save: jest.fn(),
    find: jest.fn(),
  };
  const usuariosRepository = { findOne: jest.fn() };
  const personasRepository = { findOne: jest.fn() };
  const configuracionService = { assertAllowed: jest.fn() };
  const dominiosService = { assertTelecomCapability: jest.fn() };
  const asignacionesService = { create: jest.fn() };
  const prestamosActivoService = { create: jest.fn() };
  const reparacionesActivoService = { create: jest.fn() };
  const outboxRepository = { create: jest.fn(), save: jest.fn() };
  const txSolicitudRepository = { create: jest.fn(), save: jest.fn() };
  const usuarioRolesRepository = { find: jest.fn() };
  const rolPermisosRepository = { find: jest.fn() };
  const permisosRepository = { findOne: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'portal@empresa.com',
  };

  let service: SolicitudesService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new SolicitudesService(
      solicitudesRepository as never,
      usuariosRepository as never,
      personasRepository as never,
      configuracionService as never,
      dominiosService as never,
      asignacionesService as never,
      prestamosActivoService as never,
      reparacionesActivoService as never,
      usuarioRolesRepository as never,
      rolPermisosRepository as never,
      permisosRepository as never,
    );
    usuariosRepository.findOne.mockResolvedValue({
      id: user.userId,
      empresaId: user.empresaId,
      personaId: '33333333-3333-3333-3333-333333333333',
    });
    configuracionService.assertAllowed.mockResolvedValue(undefined);
    dominiosService.assertTelecomCapability.mockResolvedValue(undefined);
    usuarioRolesRepository.find.mockResolvedValue([{ rolId: 'role-1' }]);
    rolPermisosRepository.find.mockResolvedValue([{ permisoId: 'permission-1' }]);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'asignaciones.gestionar' });
    personasRepository.findOne.mockResolvedValue({
      id: '33333333-3333-3333-3333-333333333333',
      empresaId: user.empresaId,
      estado: 'activo',
      deletedAt: null,
    });
    solicitudesRepository.manager = {
      transaction: jest.fn(async (runner) =>
        runner({
          getRepository: jest.fn((entity) => {
            if (entity?.name === 'Solicitud') {
              return txSolicitudRepository;
            }
            return outboxRepository;
          }),
        }),
      ),
    } as never;
    txSolicitudRepository.create.mockImplementation((v) => v);
    txSolicitudRepository.save.mockResolvedValue({
      id: 'sol-1',
      empresaId: user.empresaId,
      estado: 'pendiente',
      recursoTipo: 'laptop',
      tipoSolicitud: 'activo',
      origen: 'portal',
      canalEntrada: undefined,
      referenciaExterna: undefined,
      createdAt: new Date().toISOString(),
    });
    outboxRepository.create.mockImplementation((v) => v);
    outboxRepository.save.mockResolvedValue(undefined);
    solicitudesRepository.save.mockImplementation(async (value) => value);
    asignacionesService.create.mockResolvedValue({
      id: 'asg-1',
      empresaId: user.empresaId,
      estado: 'borrador',
    });
    prestamosActivoService.create.mockResolvedValue({
      id: 'prs-1',
      empresaId: user.empresaId,
      estado: 'prestado',
    });
    reparacionesActivoService.create.mockResolvedValue({
      id: 'rep-1',
      empresaId: user.empresaId,
      estado: 'abierta',
    });
  });

  it('rechaza combinación inválida tipoSolicitud/recursoTipo', async () => {
    await expect(
      service.create(
        {
          tipoSolicitud: 'activo',
          recursoTipo: 'paquete_datos',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requiere recursoId para recarga_minutos', async () => {
    await expect(
      service.create(
        {
          tipoSolicitud: 'telecom',
          recursoTipo: 'recarga_minutos',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requiere rango de fechas para prestamo_actividad', async () => {
    await expect(
      service.create(
        {
          tipoSolicitud: 'activo',
          recursoTipo: 'prestamo_actividad',
          desdeEn: '2026-09-20T00:00:00.000Z',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('publica evento outbox cuando crea solicitud', async () => {
    await service.create(
      {
        tipoSolicitud: 'activo',
        recursoTipo: 'laptop',
      } as never,
      user,
    );

    expect(outboxRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        aggregateType: 'solicitud_portal',
        eventType: 'solicitud_creada',
        estado: 'pendiente',
      }),
    );
    expect(outboxRepository.save).toHaveBeenCalled();
  });

  it('crea solicitud mixta con grupo, padre, dominios y outbox atómico', async () => {
    txSolicitudRepository.save
      .mockResolvedValueOnce({ id: 'sol-equipo', dominio: 'equipos', grupoId: 'group-1', solicitudPadreId: 'sol-equipo' })
      .mockResolvedValueOnce({ id: 'sol-telecom', dominio: 'telecom', grupoId: 'group-1', solicitudPadreId: 'sol-equipo' });

    const result = await service.createMixta({
      equipoRecursoTipo: 'laptop',
      equipoRecursoId: 'asset-1',
      telecomRecursoTipo: 'recarga_minutos',
      telecomRecursoId: 'line-1',
      motivo: 'Alta integral',
    } as never, user);

    expect(result.solicitudes).toHaveLength(2);
    expect(txSolicitudRepository.save).toHaveBeenCalledTimes(2);
    expect(txSolicitudRepository.create).toHaveBeenCalledWith(expect.objectContaining({ dominio: 'equipos', solicitudPadreId: expect.any(String) }));
    expect(txSolicitudRepository.create).toHaveBeenCalledWith(expect.objectContaining({ dominio: 'telecom' }));
    expect(outboxRepository.save).toHaveBeenCalledWith(expect.any(Array));
  });

  it('requiere canalEntrada cuando origen es externa', async () => {
    await expect(
      service.create(
        {
          tipoSolicitud: 'activo',
          recursoTipo: 'laptop',
          origen: 'externa',
          referenciaExterna: 'TCK-001',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza create cuando personaId no corresponde a persona activa del tenant', async () => {
    personasRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          personaId: '44444444-4444-4444-4444-444444444444',
          tipoSolicitud: 'activo',
          recursoTipo: 'laptop',
        } as never,
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('aprueba solicitud pendiente y cambia estado', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-10',
      empresaId: user.empresaId,
      estado: 'pendiente',
      motivo: 'Solicitud original',
    });
    solicitudesRepository.save.mockImplementation(async (value) => value);

    const result = await service.aprobar(
      'sol-10',
      user,
      { motivoRevision: 'Aprobado por operación' } as never,
    );

    expect(result.estado).toBe('aprobada');
    expect(result.motivo).toContain('Aprobado por operación');
  });

  it('rechaza aprobación cuando no está pendiente', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-11',
      empresaId: user.empresaId,
      estado: 'aprobada',
    });

    await expect(
      service.aprobar('sol-11', user, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('impide que un operador Telecom apruebe una solicitud Equipos', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-equipos',
      empresaId: user.empresaId,
      estado: 'pendiente',
      tipoSolicitud: 'activo',
    });
    permisosRepository.findOne.mockResolvedValue(null);

    await expect(service.aprobar('sol-equipos', user, {} as never)).rejects.toThrow('dominio activo');
  });

  it('impide que un operador Equipos apruebe una solicitud Telecom', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-telecom',
      empresaId: user.empresaId,
      estado: 'pendiente',
      tipoSolicitud: 'telecom',
    });
    permisosRepository.findOne.mockResolvedValue(null);

    await expect(service.aprobar('sol-telecom', user, {} as never)).rejects.toThrow('dominio telecom');
  });

  it('permite al operador transversal con ambos permisos aprobar ambos dominios', async () => {
    const equipos = { id: 'sol-equipos', empresaId: user.empresaId, estado: 'pendiente', tipoSolicitud: 'activo' };
    const telecom = { id: 'sol-telecom', empresaId: user.empresaId, estado: 'pendiente', tipoSolicitud: 'telecom' };
    solicitudesRepository.findOne = jest.fn().mockResolvedValueOnce(equipos).mockResolvedValueOnce(telecom);
    permisosRepository.findOne.mockResolvedValue({ codigo: 'permiso-transversal' });
    solicitudesRepository.save.mockImplementation(async (value) => value);

    await expect(service.aprobar('sol-equipos', user, {} as never)).resolves.toMatchObject({ estado: 'aprobada' });
    await expect(service.aprobar('sol-telecom', user, {} as never)).resolves.toMatchObject({ estado: 'aprobada' });
  });

  it('rechaza solicitud pendiente y cambia estado', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-12',
      empresaId: user.empresaId,
      estado: 'pendiente',
      motivo: 'Solicitud original',
    });
    solicitudesRepository.save.mockImplementation(async (value) => value);

    const result = await service.rechazar(
      'sol-12',
      user,
      { motivoRevision: 'Falta evidencia' } as never,
    );

    expect(result.estado).toBe('rechazada');
    expect(result.motivo).toContain('Falta evidencia');
  });

  it('convierte solicitud aprobada a asignacion sin duplicar', async () => {
    solicitudesRepository.findOne = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'sol-20',
        empresaId: user.empresaId,
        estado: 'aprobada',
        motivo: 'Solicitud aprobada',
      })
      .mockResolvedValueOnce(null);
    solicitudesRepository.manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    } as never;
    solicitudesRepository.save.mockResolvedValue({
      id: 'sol-20',
      estado: 'en_proceso',
    });

    const result = await service.convertirAAsignacion(
      'sol-20',
      user,
      {
        personaId: '33333333-3333-3333-3333-333333333333',
        fechaAsignacion: '2026-09-18T10:00:00.000Z',
      } as never,
    );

    expect(result.asignacionId).toBe('asg-1');
    expect(result.estadoSolicitud).toBe('en_proceso');
    expect(asignacionesService.create).toHaveBeenCalled();
    expect(asignacionesService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: '33333333-3333-3333-3333-333333333333',
      }),
      user,
    );
  });

  it('evita conversión duplicada de la misma solicitud', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-21',
      empresaId: user.empresaId,
      estado: 'aprobada',
      motivo: 'Solicitud aprobada',
    });
    solicitudesRepository.manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue({ id: 'asg-previa' }),
        }),
      }),
      createQueryBuilder: jest.fn(),
    } as never;

    await expect(
      service.convertirAAsignacion('sol-21', user, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(asignacionesService.create).not.toHaveBeenCalled();
  });

  it('rechaza conversión cuando la solicitud no esta aprobada', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-22',
      empresaId: user.empresaId,
      estado: 'pendiente',
    });

    await expect(
      service.convertirAAsignacion('sol-22', user, {} as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('convierte solicitud aprobada a prestamo sin duplicar', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-30',
      empresaId: user.empresaId,
      estado: 'aprobada',
      personaId: '33333333-3333-3333-3333-333333333333',
      motivo: 'Prestamo temporal',
    });
    solicitudesRepository.manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    } as never;
    solicitudesRepository.save.mockResolvedValue({
      id: 'sol-30',
      estado: 'en_proceso',
    });

    const result = await service.convertirAPrestamo(
      'sol-30',
      user,
      {
        activoId: '44444444-4444-4444-4444-444444444444',
      } as never,
    );

    expect(result.prestamoId).toBe('prs-1');
    expect(result.estadoSolicitud).toBe('en_proceso');
    expect(prestamosActivoService.create).toHaveBeenCalled();
  });

  it('convierte solicitud aprobada a reparacion sin duplicar', async () => {
    solicitudesRepository.findOne = jest.fn().mockResolvedValue({
      id: 'sol-31',
      empresaId: user.empresaId,
      estado: 'aprobada',
      motivo: 'Reparacion requerida',
    });
    solicitudesRepository.manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getOne: jest.fn().mockResolvedValue(null),
        }),
      }),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      }),
    } as never;
    solicitudesRepository.save.mockResolvedValue({
      id: 'sol-31',
      estado: 'en_proceso',
    });

    const result = await service.convertirAReparacion(
      'sol-31',
      user,
      {
        activoId: '55555555-5555-5555-5555-555555555555',
        diagnostico: 'Fallo de encendido',
      } as never,
    );

    expect(result.reparacionId).toBe('rep-1');
    expect(result.estadoSolicitud).toBe('en_proceso');
    expect(reparacionesActivoService.create).toHaveBeenCalled();
  });
});
