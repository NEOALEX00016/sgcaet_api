import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PiezasRepuestosService } from './piezas-repuestos.service';
import { PiezaRepuesto } from './entities/piezas-repuesto.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

describe('PiezasRepuestosService', () => {
  const user = { userId: '10000000-0000-4000-8000-000000000001', empresaId: '20000000-0000-4000-8000-000000000001', correo: 'test@sgcaet.test' };
  const piezas = { findOne: jest.fn(), find: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve({ id: 'pieza-1', ...value })), merge: jest.fn((target, value) => ({ ...target, ...value })) };
  const especificaciones = { findOne: jest.fn(), find: jest.fn() };
  const activos = { findOne: jest.fn() };
  const tipos = { findOne: jest.fn() };
  const bitacora = { create: jest.fn((value) => value), save: jest.fn() };
  const existencias = { findOne: jest.fn(), create: jest.fn((value) => value), save: jest.fn((value) => Promise.resolve(value)) };
  const unidades = { findOne: jest.fn() };
  const movimientos = { findOne: jest.fn() };
  const componentes = { findOne: jest.fn() };
  const manager = { getRepository: jest.fn((entity) => new Map<any, any>([
    [PiezaRepuesto, piezas], [EspecificacionTipoActivo, especificaciones], [ExistenciaRepuesto, existencias],
    [UnidadRepuesto, unidades], [MovimientoRepuesto, movimientos], [ComponenteInstaladoActivo, componentes],
    [BitacoraAuditoriaSistema, bitacora],
  ]).get(entity)) };
  const dataSource = {
    transaction: jest.fn((callback) => callback(manager)),
    getRepository: jest.fn((entity) => manager.getRepository(entity)),
  };
  const service = new PiezasRepuestosService(piezas as never, especificaciones as never, activos as never, tipos as never, bitacora as never, dataSource as never);

  beforeEach(() => {
    jest.clearAllMocks();
    piezas.save.mockImplementation((value) => Promise.resolve({ id: 'pieza-1', ...value }));
    existencias.findOne.mockResolvedValue(null);
    unidades.findOne.mockResolvedValue(null);
    movimientos.findOne.mockResolvedValue(null);
    componentes.findOne.mockResolvedValue(null);
  });

  it('rejects a specification from another tenant', async () => {
    especificaciones.findOne.mockResolvedValue(null);
    await expect(service.create({ especificacionTipoActivoId: '30000000-0000-4000-8000-000000000001', codigo: 'ram-1', nombreComercial: 'RAM' }, user)).rejects.toBeInstanceOf(NotFoundException);
    expect(piezas.save).not.toHaveBeenCalled();
  });

  it('normalizes and creates a tenant-scoped part', async () => {
    especificaciones.findOne.mockResolvedValue({ id: 'spec-1' });
    piezas.findOne.mockResolvedValue(null);
    const result = await service.create({ especificacionTipoActivoId: '30000000-0000-4000-8000-000000000001', codigo: ' ram-1 ', nombreComercial: 'Memoria RAM', stockMinimo: '2' }, user);
    expect(result).toMatchObject({ empresaId: user.empresaId, codigo: 'RAM-1', stockMinimo: '2' });
    expect(existencias.save).toHaveBeenCalledWith(expect.objectContaining({ piezaRepuestoId: 'pieza-1', cantidadDisponible: '0.0000', cantidadReservada: '0.0000' }));
    expect(bitacora.save).toHaveBeenCalled();
  });

  it('does not create a stock row for a serialized part', async () => {
    especificaciones.findOne.mockResolvedValue({ id: 'spec-1' });
    piezas.findOne.mockResolvedValue(null);
    await service.create({ especificacionTipoActivoId: 'spec-1', codigo: 'SSD-1', nombreComercial: 'SSD', esSerializado: true }, user);
    expect(existencias.save).not.toHaveBeenCalled();
  });

  it('rejects identity changes after any stock history exists', async () => {
    piezas.findOne.mockResolvedValue({ id: 'pieza-1', empresaId: user.empresaId, codigo: 'RAM-1', nombreComercial: 'RAM', especificacionTipoActivoId: 'spec-1', esSerializado: false });
    existencias.findOne.mockResolvedValue({ id: 'stock-1', piezaRepuestoId: 'pieza-1' });
    await expect(service.update('pieza-1', { esSerializado: true }, user)).rejects.toThrow('son inmutables');
  });

  it('rejects deactivation while reservations remain', async () => {
    piezas.findOne.mockResolvedValue({ id: 'pieza-1', empresaId: user.empresaId, estaActiva: true });
    existencias.findOne.mockResolvedValue({ cantidadReservada: '1.0000' });
    await expect(service.remove('pieza-1', user)).rejects.toThrow('reservas activas');
    expect(piezas.save).not.toHaveBeenCalled();
  });

  it('rejects PATCH deactivation while reservations remain', async () => {
    piezas.findOne.mockResolvedValue({ id: 'pieza-1', empresaId: user.empresaId, codigo: 'RAM-1', nombreComercial: 'RAM', estaActiva: true });
    unidades.findOne.mockResolvedValue({ id: 'unit-1', estado: 'reservada' });
    await expect(service.update('pieza-1', { estaActiva: false }, user)).rejects.toThrow('reservas activas');
    expect(piezas.save).not.toHaveBeenCalled();
  });

  it('rejects negative stock minimum', async () => {
    especificaciones.findOne.mockResolvedValue({ id: 'spec-1' });
    piezas.findOne.mockResolvedValue(null);
    await expect(service.create({ especificacionTipoActivoId: '30000000-0000-4000-8000-000000000001', codigo: 'RAM-2', nombreComercial: 'RAM', stockMinimo: '-1' }, user)).rejects.toBeInstanceOf(BadRequestException);
  });
});
