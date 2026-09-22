import { BadRequestException } from '@nestjs/common';
import { MovimientosRepuestosService } from './movimientos-repuestos.service';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { MovimientoRepuesto } from './entities/movimientos-repuesto.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('MovimientosRepuestosService', () => {
  const user = { userId: '10000000-0000-4000-8000-000000000001', empresaId: '20000000-0000-4000-8000-000000000001', correo: 'test@sgcaet.test' };
  const movementRepo = { find: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve({ id: 'mov-1', ...value })) };
  const pieceRepo = { findOne: jest.fn() };
  const stockRepo = { findOne: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) };
  const auditRepo = { create: jest.fn((value) => value), save: jest.fn() };
  const manager = { getRepository: jest.fn((entity) => entity === PiezaRepuesto ? pieceRepo : entity === ExistenciaRepuesto ? stockRepo : entity === MovimientoRepuesto ? movementRepo : entity === BitacoraAuditoriaSistema ? auditRepo : {}) };
  const dataSource = { transaction: jest.fn((callback) => callback(manager)) };
  const service = new MovimientosRepuestosService(movementRepo as never, dataSource as never);

  beforeEach(() => jest.clearAllMocks());

  it('adds a non-serialized entry under transaction and records balances', async () => {
    pieceRepo.findOne.mockResolvedValue({ id: 'pieza-1', empresaId: user.empresaId, estaActiva: true, esSerializado: false });
    stockRepo.findOne.mockResolvedValue({ empresaId: user.empresaId, piezaRepuestoId: 'pieza-1', cantidadDisponible: '3.0000', cantidadReservada: '0' });
    const result = await service.createEntry({ piezaRepuestoId: 'pieza-1', cantidad: '2' }, user);
    expect(result).toMatchObject({ tipoMovimiento: 'entrada', saldoAnterior: '3.0000', saldoNuevo: '5.0000' });
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an adjustment that would make stock negative', async () => {
    pieceRepo.findOne.mockResolvedValue({ id: 'pieza-1', empresaId: user.empresaId, estaActiva: true, esSerializado: false });
    stockRepo.findOne.mockResolvedValue({ empresaId: user.empresaId, piezaRepuestoId: 'pieza-1', cantidadDisponible: '1.0000', cantidadReservada: '0' });
    await expect(service.createAdjustment({ piezaRepuestoId: 'pieza-1', tipoMovimiento: 'ajuste_neg', cantidad: '2', motivo: 'Conteo físico' }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(movementRepo.save).not.toHaveBeenCalled();
  });
});
