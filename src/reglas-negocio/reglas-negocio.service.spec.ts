import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ReglaNegocio } from './entities/reglas-negocio.entity';
import { EvaluacionReglaNegocio } from './entities/evaluacion-regla-negocio.entity';
import { ReglasNegocioService } from './reglas-negocio.service';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('ReglasNegocioService', () => {
  const reglas = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), merge: jest.fn() };
  const usuarios = { findOne: jest.fn() };
  const bitacora = { create: jest.fn(), save: jest.fn() };
  const evaluaciones = { create: jest.fn(), save: jest.fn() };
  const user = { userId: 'u-1', empresaId: 'e-1' } as any;
  let service: ReglasNegocioService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ReglasNegocioService,
        { provide: getRepositoryToken(ReglaNegocio), useValue: reglas },
        { provide: getRepositoryToken(EvaluacionReglaNegocio), useValue: evaluaciones },
        { provide: getRepositoryToken(Usuario), useValue: usuarios },
        { provide: getRepositoryToken(BitacoraAuditoriaSistema), useValue: bitacora },
      ],
    }).compile();
    service = module.get(ReglasNegocioService);
    jest.resetAllMocks();
    usuarios.findOne.mockResolvedValue({ id: 'u-1' });
    reglas.create.mockImplementation((value) => value);
    reglas.save.mockImplementation(async (value) => ({ id: 'r-1', ...value }));
    bitacora.create.mockImplementation((value) => value);
    bitacora.save.mockResolvedValue(undefined);
    evaluaciones.create.mockImplementation((value) => value);
    evaluaciones.save.mockImplementation(async (value) => value);
  });

  it('crea una regla versionada y tenant-scoped', async () => {
    const result = await service.create({
      dominio: 'telecom',
      clave: 'telecom.renovacion.elegibilidad',
      nombre: 'Renovación configurable',
      configuracion: { meses: 18 },
    }, user);
    expect(result).toMatchObject({ empresaId: 'e-1', estado: 'borrador', version: 1, alcanceTipo: 'tenant' });
    expect(bitacora.save).toHaveBeenCalled();
  });

  it('rechaza vigencia invertida', async () => {
    await expect(service.create({
      dominio: 'combustible',
      clave: 'combustible.limite',
      nombre: 'Límite',
      configuracion: { galones: 100 },
      vigenteDesde: '2026-02-01T00:00:00.000Z',
      vigenteHasta: '2026-01-01T00:00:00.000Z',
    }, user)).rejects.toThrow('vigencia final');
  });

  it('selecciona la regla de alcance específico sobre tenant', async () => {
    reglas.find.mockResolvedValue([
      { id: 'tenant-rule', dominio: 'telecom', clave: 'x', alcanceTipo: 'tenant', prioridad: 100, version: 2, updatedAt: new Date('2026-01-02'), configuracion: { value: 'tenant' } },
      { id: 'line-rule', dominio: 'telecom', clave: 'x', alcanceTipo: 'linea', alcanceId: 'line-1', prioridad: 0, version: 1, updatedAt: new Date('2026-01-01'), configuracion: { value: 'line' } },
    ]);
    const result = await service.evaluate(user, 'telecom', 'x', { linea: 'line-1' }, new Date('2026-01-10'), { entidadTipo: 'lineas_telefonicas', entidadId: 'line-1' });
    expect(result.reglaId).toBe('line-rule');
    expect(evaluaciones.save).toHaveBeenCalledWith(expect.objectContaining({ reglaId: 'line-rule', entidadId: 'line-1' }));
  });

  it('rechaza empate de reglas efectivas', async () => {
    reglas.find.mockResolvedValue([
      { id: 'a', dominio: 'telecom', clave: 'x', alcanceTipo: 'tenant', prioridad: 1, version: 1, updatedAt: new Date('2026-01-01'), configuracion: {} },
      { id: 'b', dominio: 'telecom', clave: 'x', alcanceTipo: 'tenant', prioridad: 1, version: 1, updatedAt: new Date('2026-01-01'), configuracion: {} },
    ]);
    await expect(service.evaluate(user, 'telecom', 'x')).rejects.toThrow('RULE_CONFLICT');
  });

  it('conserva la versión anterior y crea una nueva versión al actualizar', async () => {
    const actual = { id: 'r-old', empresaId: 'e-1', dominio: 'telecom', clave: 'x', nombre: 'Regla', configuracion: { limite: 1 }, estado: 'activa', version: 1 } as any;
    reglas.findOne.mockResolvedValue(actual);
    reglas.merge.mockImplementation((_entity, values) => values);
    reglas.save.mockImplementation(async (value) => ({ id: value.id ?? 'r-new', ...value }));
    const result = await service.update('r-old', { configuracion: { limite: 2 } }, user);
    expect(reglas.save).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'r-old', estado: 'archivada' }));
    expect(result).toMatchObject({ id: 'r-new', version: 2, configuracion: { limite: 2 } });
    expect(result.id).not.toBe(actual.id);
  });
});
