import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MisActivosService } from './mis-activos.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { AsignacionBolsaTelecom } from '../asignaciones-bolsa-telecom/entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';

describe('MisActivosService', () => {
  it('devuelve vacío si el usuario no está vinculado a una persona', async () => {
    const service = await Test.createTestingModule({
      providers: [
        MisActivosService,
        {
          provide: getRepositoryToken(Usuario),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'u', personaId: null }),
          },
        },
        {
          provide: getRepositoryToken(Asignacion),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(AsignacionRecurso),
          useValue: { find: jest.fn() },
        },
        {
          provide: getRepositoryToken(Activo),
          useValue: { findOne: jest.fn() },
        },
        {
          provide: getRepositoryToken(LineaTelefonica),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(SuscripcionesLinea),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(PlanesTelefonico),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(AsignacionBolsaTelecom),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
        {
          provide: getRepositoryToken(BolsaTelecom),
          useValue: { findOne: jest.fn(), find: jest.fn() },
        },
      ],
    })
      .compile()
      .then((module) => module.get(MisActivosService));

    await expect(
      service.findMine({ userId: 'u', empresaId: 'e', correo: 'u@test.local' }),
    ).resolves.toEqual({ items: [], total: 0 });
  });
});
