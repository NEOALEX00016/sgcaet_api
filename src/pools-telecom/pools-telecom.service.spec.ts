import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PoolsTelecomService } from './pools-telecom.service';
import { PoolTelecom } from './entities/pools-telecom.entity';
import { CapacidadPoolTelecom } from './entities/capacidades-pool-telecom.entity';
import { ContratoTelecom } from '../contratos-telecom/entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PoolsTelecomService', () => {
  const pools = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const capacities = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() };
  const contracts = { findOne: jest.fn() };
  const operators = { findOne: jest.fn() };
  const users = { findOne: jest.fn() };
  const audit = { create: jest.fn(), save: jest.fn() };
  let service: PoolsTelecomService;
  const user = { userId: 'u-1', empresaId: 'e-1' } as any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({ providers: [
      PoolsTelecomService,
      { provide: getRepositoryToken(PoolTelecom), useValue: pools },
      { provide: getRepositoryToken(CapacidadPoolTelecom), useValue: capacities },
      { provide: getRepositoryToken(ContratoTelecom), useValue: contracts },
      { provide: getRepositoryToken(Operadora), useValue: operators },
      { provide: getRepositoryToken(Usuario), useValue: users },
      { provide: getRepositoryToken(BitacoraAuditoriaSistema), useValue: audit },
    ] }).compile();
    service = module.get(PoolsTelecomService);
    jest.resetAllMocks();
    users.findOne.mockResolvedValue({ id: 'u-1' });
    contracts.findOne.mockResolvedValue({ id: 'c-1', empresaId: 'e-1', operadoraId: 'o-1', estado: 'activo', diaRenovacion: 21 });
    operators.findOne.mockResolvedValue({ id: 'o-1', empresaId: 'e-1', estaActiva: true });
    pools.findOne.mockResolvedValue(null);
    pools.create.mockImplementation((v) => v);
    pools.save.mockImplementation(async (v) => ({ id: 'p-1', ...v }));
    capacities.findOne.mockResolvedValue(null);
    capacities.create.mockImplementation((v) => v);
    capacities.save.mockImplementation(async (v) => ({ id: 'cap-1', ...v }));
    audit.create.mockImplementation((v) => v);
  });

  it('crea pool heredando día del contrato', async () => {
    const result = await service.create({ contratoTelecomId: 'c-1', operadoraId: 'o-1', codigo: 'POOL-2026', nombre: 'Pool corporativo', iniciaEn: '2026-01-01' }, user);
    expect(result).toMatchObject({ empresaId: 'e-1', diaRenovacion: 21, heredaDiaRenovacion: true });
  });

  it('crea capacidad de minutos con rollover', async () => {
    pools.findOne.mockResolvedValue({ id: 'p-1', empresaId: 'e-1' });
    const result = await service.addCapacidad('p-1', { tipoCapacidad: 'minutos', unidad: 'minutos', cantidadContratada: '100000', rolloverHabilitado: true, cantidadRolloverMaxima: '20000' }, user);
    expect(result).toMatchObject({ tipoCapacidad: 'minutos', cantidadContratada: '100000', rolloverHabilitado: true });
  });
});
