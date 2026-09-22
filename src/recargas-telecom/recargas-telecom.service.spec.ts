import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RecargasTelecomService } from './recargas-telecom.service';
import { RecargaTelecom } from './entities/recargas-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PoliticaRecargaTelecom } from '../politicas-recarga-telecom/entities/politicas-recarga-telecom.entity';
import { CapacidadPoolTelecom } from '../pools-telecom/entities/capacidades-pool-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { MovimientosTelecom } from '../movimientos-telecom/entities/movimientos-telecom.entity';
import { DataSource } from 'typeorm';
import { ReglasNegocioService } from '../reglas-negocio/reglas-negocio.service';

describe('RecargasTelecomService', () => {
  const repo = () => ({ create: jest.fn(), save: jest.fn(), find: jest.fn(), findOne: jest.fn() });
  const recargas = repo(), lineas = repo(), politicas = repo(), capacidades = repo(), usuarios = repo(), bitacora = repo(), movimientos = repo(), reglas = { evaluate: jest.fn() };
  const dataSource = { transaction: jest.fn() };
  let service: RecargasTelecomService;
  const user = { userId: 'u-1', empresaId: 'e-1' } as any;
  beforeEach(async () => { const module = await Test.createTestingModule({ providers: [RecargasTelecomService, { provide: getRepositoryToken(RecargaTelecom), useValue: recargas }, { provide: getRepositoryToken(LineaTelefonica), useValue: lineas }, { provide: getRepositoryToken(PoliticaRecargaTelecom), useValue: politicas }, { provide: getRepositoryToken(CapacidadPoolTelecom), useValue: capacidades }, { provide: getRepositoryToken(Usuario), useValue: usuarios }, { provide: getRepositoryToken(BitacoraAuditoriaSistema), useValue: bitacora }, { provide: getRepositoryToken(MovimientosTelecom), useValue: movimientos }, { provide: DataSource, useValue: dataSource }, { provide: ReglasNegocioService, useValue: reglas }] }).compile(); service = module.get(RecargasTelecomService); jest.clearAllMocks(); usuarios.findOne.mockResolvedValue({ id: 'u-1' }); lineas.findOne.mockResolvedValue({ id: 'line-1', estaActiva: true }); recargas.findOne.mockResolvedValue(null); politicas.find.mockResolvedValue([{ id: 'policy-1', tiposCapacidad: ['minutos'], requiereAprobacion: true, alcanceTipo: 'tenant' }]); reglas.evaluate.mockResolvedValue({ configuracion: { permitida: true } }); recargas.create.mockImplementation((v) => v); recargas.save.mockImplementation(async (v) => ({ id: 'r-1', ...v })); bitacora.create.mockImplementation((v) => v); });
  it('crea recarga solicitada e idempotente', async () => { const result = await service.create({ lineaTelefonicaId: 'line-1', tipoCapacidad: 'minutos', cantidad: '100', unidad: 'minutos', claveIdempotencia: 'recharge-1' }, user); expect(result).toMatchObject({ estado: 'solicitada', politicaRecargaId: 'policy-1' }); });

  it('aplica una recarga una sola vez, registra movimiento y auditoria', async () => {
    const item = { id: 'r-1', empresaId: 'e-1', estado: 'aprobada', capacidadPoolId: 'cap-1', lineaTelefonicaId: 'line-1', cantidad: '20', unidad: 'minutos' };
    const capacity = { id: 'cap-1', cantidadContratada: '100', cantidadRolloverActual: '0', cantidadAsignada: '0', cantidadConsumida: '0' };
    const rechargeRepo = { findOne: jest.fn().mockResolvedValue(item), save: jest.fn().mockImplementation(async (value) => value) };
    const capacityRepo = { findOne: jest.fn().mockResolvedValue(capacity), save: jest.fn().mockResolvedValue(capacity) };
    const movementRepo = { create: jest.fn().mockImplementation((value) => value), save: jest.fn().mockResolvedValue(undefined) };
    const auditRepo = { create: jest.fn().mockImplementation((value) => value), save: jest.fn().mockResolvedValue(undefined) };
    dataSource.transaction.mockImplementation((callback) => callback({ getRepository: (entity) => entity === RecargaTelecom ? rechargeRepo : entity === CapacidadPoolTelecom ? capacityRepo : entity === MovimientosTelecom ? movementRepo : auditRepo }));

    const result = await service.apply('r-1', user);

    expect(result.estado).toBe('aplicada');
    expect(capacity.cantidadConsumida).toBe('20.0000');
    expect(movementRepo.save).toHaveBeenCalledWith(expect.objectContaining({ claveIdempotencia: 'recarga:r-1' }));
    expect(auditRepo.save).toHaveBeenCalledWith(expect.objectContaining({ accion: 'RECARGAS_TELECOM_APLICAR' }));
  });

  it('rechaza aplicación sin capacidad disponible', async () => {
    const rechargeRepo = { findOne: jest.fn().mockResolvedValue({ id: 'r-2', empresaId: 'e-1', estado: 'aprobada', capacidadPoolId: 'cap-1', cantidad: '20' }) };
    const capacityRepo = { findOne: jest.fn().mockResolvedValue({ cantidadContratada: '10', cantidadRolloverActual: '0', cantidadAsignada: '0', cantidadConsumida: '0' }) };
    dataSource.transaction.mockImplementation((callback) => callback({ getRepository: (entity) => entity === RecargaTelecom ? rechargeRepo : capacityRepo }));
    await expect(service.apply('r-2', user)).rejects.toThrow('Capacidad insuficiente');
  });
});
