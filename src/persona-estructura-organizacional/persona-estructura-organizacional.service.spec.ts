import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PersonaEstructuraOrganizacionalService } from './persona-estructura-organizacional.service';
import { PersonaEstructuraOrganizacional } from './entities/persona-estructura-organizacional.entity';
import { Persona } from '../personas/entities/persona.entity';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PersonaEstructuraOrganizacionalService', () => {
  let service: PersonaEstructuraOrganizacionalService;

  const repoMock = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    merge: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const personasMock = { findOne: jest.fn() };
  const nodosMock = { findOne: jest.fn() };
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
        PersonaEstructuraOrganizacionalService,
        {
          provide: getRepositoryToken(PersonaEstructuraOrganizacional),
          useValue: repoMock,
        },
        { provide: getRepositoryToken(Persona), useValue: personasMock },
        {
          provide: getRepositoryToken(EstructuraOrganizacionalNodo),
          useValue: nodosMock,
        },
        { provide: getRepositoryToken(Usuario), useValue: usuariosMock },
        {
          provide: getRepositoryToken(BitacoraAuditoriaSistema),
          useValue: bitacoraMock,
        },
      ],
    }).compile();

    service = module.get<PersonaEstructuraOrganizacionalService>(
      PersonaEstructuraOrganizacionalService,
    );

    jest.resetAllMocks();
  });

  it('rechaza FK cross-tenant cuando persona no pertenece al tenant', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    personasMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          personaId: 'persona-tenant-b',
          estructuraNodoId: 'nodo-a',
          esPrincipal: true,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(personasMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'persona-tenant-b',
        empresaId: user.empresaId,
        deletedAt: expect.anything(),
      },
    });
  });

  it('rechaza FK cross-tenant cuando nodo no pertenece al tenant', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    personasMock.findOne.mockResolvedValue({
      id: 'persona-a',
      empresaId: user.empresaId,
    });
    nodosMock.findOne.mockResolvedValue(null);

    await expect(
      service.create(
        {
          personaId: 'persona-a',
          estructuraNodoId: 'nodo-tenant-b',
          esPrincipal: true,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(nodosMock.findOne).toHaveBeenCalledWith({
      where: {
        id: 'nodo-tenant-b',
        empresaId: user.empresaId,
      },
    });
  });

  it('normaliza principal para mantener solo una asignacion principal por persona', async () => {
    usuariosMock.findOne.mockResolvedValue({ id: user.userId });
    personasMock.findOne.mockResolvedValue({
      id: 'persona-a',
      empresaId: user.empresaId,
    });
    nodosMock.findOne.mockResolvedValue({
      id: 'nodo-a',
      empresaId: user.empresaId,
    });
    repoMock.create.mockReturnValue({
      id: 'rel-1',
      personaId: 'persona-a',
      estructuraNodoId: 'nodo-a',
      esPrincipal: true,
      empresaId: user.empresaId,
    });
    repoMock.save.mockResolvedValue({
      id: 'rel-1',
      personaId: 'persona-a',
      estructuraNodoId: 'nodo-a',
      esPrincipal: true,
      empresaId: user.empresaId,
    });
    repoMock.update.mockResolvedValue({ affected: 1 });
    bitacoraMock.create.mockReturnValue({ id: 'bit-1' });
    bitacoraMock.save.mockResolvedValue({ id: 'bit-1' });

    await service.create(
      {
        personaId: 'persona-a',
        estructuraNodoId: 'nodo-a',
        esPrincipal: true,
      },
      user,
    );

    expect(repoMock.update).toHaveBeenCalledTimes(1);
    expect(repoMock.update).toHaveBeenCalledWith(
      expect.objectContaining({
        empresaId: user.empresaId,
        personaId: 'persona-a',
        esPrincipal: true,
      }),
      { esPrincipal: false },
    );
  });

  it('rechaza rango de fechas invalido', async () => {
    await expect(
      service.create(
        {
          personaId: 'persona-a',
          estructuraNodoId: 'nodo-a',
          iniciaEn: '2026-09-20',
          finalizaEn: '2026-09-10',
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
