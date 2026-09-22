import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EntradaMovimientoRepuestoDto } from './dto/entrada-movimiento-repuesto.dto';
import { AjusteMovimientoRepuestoDto } from './dto/ajuste-movimiento-repuesto.dto';
import { MovimientoRepuesto } from './entities/movimientos-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class MovimientosRepuestosService {
  constructor(@InjectRepository(MovimientoRepuesto) private readonly movimientos: Repository<MovimientoRepuesto>, private readonly dataSource: DataSource) {}

  async createEntry(dto: EntradaMovimientoRepuestoDto, user: AuthenticatedUser) {
    return this.dataSource.transaction(async (manager) => {
      const pieza = await manager.getRepository(PiezaRepuesto).findOne({ where: { id: dto.piezaRepuestoId, empresaId: user.empresaId, estaActiva: true }, lock: { mode: 'pessimistic_write' } });
      if (!pieza) throw new NotFoundException('Pieza de repuesto no encontrada');
      if (pieza.esSerializado) {
        const seriales = [...new Set((dto.unidades ?? []).map((serial) => serial.trim().toUpperCase()).filter(Boolean))];
        if (!seriales.length) throw new BadRequestException('La entrada serializada requiere al menos un serial');
        if (seriales.length !== dto.unidades?.length) throw new BadRequestException('Los seriales de la entrada deben ser únicos');
        const unidadRepo = manager.getRepository(UnidadRepuesto);
        for (const numeroSerie of seriales) {
          if (await unidadRepo.findOne({ where: { empresaId: user.empresaId, numeroSerie } })) throw new BadRequestException(`Ya existe la unidad con serial ${numeroSerie}`);
        }
        const unidades = await unidadRepo.save(seriales.map((numeroSerie) => unidadRepo.create({ empresaId: user.empresaId, piezaRepuestoId: pieza.id, numeroSerie, estado: 'disponible', costoEntrada: dto.costoEntrada, moneda: dto.moneda?.toUpperCase() })));
        const movementRepo = manager.getRepository(MovimientoRepuesto);
        const movements = await movementRepo.save(unidades.map((unidad) => movementRepo.create({ empresaId: user.empresaId, piezaRepuestoId: pieza.id, unidadRepuestoId: unidad.id, tipoMovimiento: 'entrada', cantidad: '1', motivo: dto.motivo, referencia: dto.referencia, creadoPor: user.userId })));
        await this.audit(manager.getRepository(BitacoraAuditoriaSistema), user, 'REPUESTOS_ENTRADA', pieza.id, { cantidad: unidades.length, serializada: true });
        return movements;
      }
      if (dto.unidades?.length) throw new BadRequestException('La pieza no serializada no acepta seriales');
      const cantidad = this.positive(dto.cantidad);
      const { before, after } = await this.changeStock(manager, pieza, cantidad);
      const movement = await manager.getRepository(MovimientoRepuesto).save(manager.getRepository(MovimientoRepuesto).create({ empresaId: user.empresaId, piezaRepuestoId: pieza.id, tipoMovimiento: 'entrada', cantidad: this.decimal(cantidad), saldoAnterior: this.decimal(before), saldoNuevo: this.decimal(after), motivo: dto.motivo, referencia: dto.referencia, creadoPor: user.userId }));
      await this.audit(manager.getRepository(BitacoraAuditoriaSistema), user, 'REPUESTOS_ENTRADA', pieza.id, movement);
      return movement;
    });
  }

  async createAdjustment(dto: AjusteMovimientoRepuestoDto, user: AuthenticatedUser) {
    return this.dataSource.transaction(async (manager) => {
      const pieza = await manager.getRepository(PiezaRepuesto).findOne({ where: { id: dto.piezaRepuestoId, empresaId: user.empresaId, estaActiva: true }, lock: { mode: 'pessimistic_write' } });
      if (!pieza) throw new NotFoundException('Pieza de repuesto no encontrada');
      if (pieza.esSerializado) throw new BadRequestException('Las piezas serializadas se ajustan mediante sus unidades');
      const cantidad = this.positive(dto.cantidad);
      const delta = dto.tipoMovimiento === 'ajuste_pos' ? cantidad : -cantidad;
      const { before, after } = await this.changeStock(manager, pieza, delta);
      const repo = manager.getRepository(MovimientoRepuesto);
      const movement = await repo.save(repo.create({ ...dto, empresaId: user.empresaId, cantidad: this.decimal(cantidad), saldoAnterior: this.decimal(before), saldoNuevo: this.decimal(after), creadoPor: user.userId }));
      await this.audit(manager.getRepository(BitacoraAuditoriaSistema), user, 'REPUESTOS_AJUSTE', pieza.id, movement);
      return movement;
    });
  }

  findAll(user: AuthenticatedUser, piezaRepuestoId?: string) {
    return this.movimientos.find({ where: { empresaId: user.empresaId, ...(piezaRepuestoId ? { piezaRepuestoId } : {}) }, order: { createdAt: 'DESC' } });
  }

  private async changeStock(manager: EntityManager, pieza: PiezaRepuesto, delta: number) {
    const repo = manager.getRepository(ExistenciaRepuesto);
    let stock = await repo.findOne({ where: { empresaId: pieza.empresaId, piezaRepuestoId: pieza.id }, lock: { mode: 'pessimistic_write' } });
    if (!stock) stock = await repo.save(repo.create({ empresaId: pieza.empresaId, piezaRepuestoId: pieza.id, cantidadDisponible: '0', cantidadReservada: '0' }));
    const before = Number(stock.cantidadDisponible);
    const after = before + delta;
    if (after < 0) throw new BadRequestException('STOCK_INSUFICIENTE: el ajuste dejaría saldo negativo');
    stock.cantidadDisponible = this.decimal(after);
    await repo.save(stock);
    return { before, after };
  }

  private positive(value?: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) throw new BadRequestException('La cantidad debe ser mayor que cero');
    return parsed;
  }

  private decimal(value: number) { return value.toFixed(4); }

  private async audit(repo: Repository<BitacoraAuditoriaSistema>, user: AuthenticatedUser, accion: string, id: string, values: unknown) {
    await repo.save(repo.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'piezas_repuestos', entidadId: id, valoresNuevos: values as Record<string, unknown>, resultado: 'exito' }));
  }
}
