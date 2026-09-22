import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ContratosTelecomService } from './contratos-telecom.service';
import { ContratoTelecom } from './entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('ContratosTelecomService', () => {
  const contratos = { create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn(), merge: jest.fn() };
  const operadoras = { findOne: jest.fn() };
  const usuarios = { findOne: jest.fn() };
  const bitacora = { create: jest.fn(), save: jest.fn() };
  const user = { userId: 'u-1', empresaId: 'e-1' } as any;

  let service: ContratosTelecomService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ContratosTelecomService,
        { provide: getRepositoryToken(ContratoTelecom), useValue: contratos },
        { provide: getRepositoryToken(Operadora), useValue: operadoras },
        { provide: getRepositoryToken(Usuario), useValue: usuarios },
        { provide: getRepositoryToken(BitacoraAuditoriaSistema), useValue: bitacora },
      ],
    }).compile();
    service = module.get(ContratosTelecomService);
    jest.resetAllMocks();
    usuarios.findOne.mockResolvedValue({ id: 'u-1' });
    operadoras.findOne.mockResolvedValue({ id: 'op-1', empresaId: 'e-1', estaActiva: true });
    contratos.findOne.mockResolvedValue(null);
    contratos.create.mockImplementation((value) => value);
    contratos.save.mockImplementation(async (value) => ({ id: 'contract-1', ...value }));
    bitacora.create.mockImplementation((value) => value);
    bitacora.save.mockResolvedValue(undefined);
  });

  it('crea contrato tenant-scoped y audita', async () => {
    const result = await service.create({
      operadoraId: 'op-1',
      codigo: ' claro-2026 ',
      nombre: 'Contrato Claro',
      iniciaEn: '2026-01-01',
    }, user);

    expect(result).toMatchObject({ empresaId: 'e-1', codigo: 'CLARO-2026', estado: 'borrador' });
    expect(bitacora.save).toHaveBeenCalled();
  });

  it('rechaza operadora de otro alcance', async () => {
    operadoras.findOne.mockResolvedValue(null);
    await expect(service.create({
      operadoraId: 'op-other',
      codigo: 'C-1',
      nombre: 'Contrato',
      iniciaEn: '2026-01-01',
    }, user)).rejects.toThrow('operadora no existe');
  });
});
