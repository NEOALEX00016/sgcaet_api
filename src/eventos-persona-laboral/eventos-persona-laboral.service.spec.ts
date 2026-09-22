import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventosPersonaLaboralService } from './eventos-persona-laboral.service';
import { EventosPersonaLaboral } from './entities/eventos-persona-laboral.entity';
import { Persona } from '../personas/entities/persona.entity';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('EventosPersonaLaboralService', () => {
  let service: EventosPersonaLaboralService;

  const repoMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
  };
  const personasMock = { findOne: jest.fn() };
  const fuentesMock = { findOne: jest.fn() };
  const usuariosMock = { findOne: jest.fn() };
  const bitacoraMock = { create: jest.fn(), save: jest.fn() };

  const user = {
    userId: '22222222-2222-2222-2222-222222222222',
    empresaId: '11111111-1111-1111-1111-111111111111',
    correo: 'admin@empresa.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventosPersonaLaboralService,
        {
          provide: getRepositoryToken(EventosPersonaLaboral),
          useValue: repoMock,
        },
        { provide: getRepositoryToken(Persona), useValue: personasMock },
        {
          provide: getRepositoryToken(FuentesEmpleado),
          useValue: fuentesMock,
        },
        { provide: getRepositoryToken(Usuario), useValue: usuariosMock },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraMock,
        },
      ],
    }).compile();

    service = module.get<EventosPersonaLaboralService>(
      EventosPersonaLaboralService,
    );
    jest.resetAllMocks();
  });

  it('crea evento laboral con trazabilidad', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    personasMock.findOne.mockResolvedValue({
      id: 'persona-a',
      empresaId: user.empresaId,
    });
    repoMock.create.mockReturnValue({ id: 'evt-1' });
    repoMock.save.mockResolvedValue({ id: 'evt-1' });
    bitacoraMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraMock.save.mockResolvedValue({ id: 'bit-1' });

    const result = await service.create(
      {
        personaId: 'persona-a',
        tipoEvento: 'alta_detectada',
        estadoNuevo: 'activo',
      },
      user,
    );

    expect(result).toMatchObject({ id: 'evt-1' });
    expect(bitacoraMock.save).toHaveBeenCalled();
  });

  it('rechaza cambio_detectado sin estadoAnterior', async () => {
    await expect(
      service.create(
        {
          personaId: 'persona-a',
          tipoEvento: 'cambio_detectado',
          estadoNuevo: 'activo',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza evento con estadoAnterior y estadoNuevo iguales', async () => {
    await expect(
      service.create(
        {
          personaId: 'persona-a',
          tipoEvento: 'reactivacion_detectada',
          estadoAnterior: 'activo',
          estadoNuevo: 'activo',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza persona de otro tenant', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    personasMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          personaId: 'persona-tenant-b',
          tipoEvento: 'alta_detectada',
          estadoNuevo: 'activo',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
