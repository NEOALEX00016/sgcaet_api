import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { CreatePiezasRepuestoDto } from './dto/create-piezas-repuesto.dto';
import { UpdatePiezasRepuestoDto } from './dto/update-piezas-repuesto.dto';
import { PiezaRepuesto } from './entities/piezas-repuesto.entity';
import { EspecificacionTipoActivo } from '../especificaciones-tipo-activo/entities/especificacion-tipo-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ExistenciaRepuesto } from '../existencias-repuestos/entities/existencias-repuesto.entity';
import { UnidadRepuesto } from '../unidades-repuestos/entities/unidades-repuesto.entity';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';
import { ComponenteInstaladoActivo } from '../componentes-instalados-activo/entities/componente-instalado-activo.entity';

@Injectable()
export class PiezasRepuestosService {
  constructor(
    @InjectRepository(PiezaRepuesto) private readonly piezas: Repository<PiezaRepuesto>,
    @InjectRepository(EspecificacionTipoActivo) private readonly especificaciones: Repository<EspecificacionTipoActivo>,
    @InjectRepository(Activo) private readonly activos: Repository<Activo>,
    @InjectRepository(TiposActivo) private readonly tipos: Repository<TiposActivo>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePiezasRepuestoDto, user: AuthenticatedUser) {
    const codigo = dto.codigo.trim().toUpperCase();
    this.validateNumbers(dto);
    return this.dataSource.transaction(async manager => {
      const piezas = manager.getRepository(PiezaRepuesto);
      await this.validateSpecification(dto.especificacionTipoActivoId, user, manager);
      if (await piezas.findOne({ where: { empresaId: user.empresaId, codigo } })) {
        throw new BadRequestException('Ya existe una pieza con ese código');
      }
      const saved = await piezas.save(piezas.create({
        ...dto,
        empresaId: user.empresaId,
        codigo,
        nombreComercial: dto.nombreComercial.trim(),
        stockMinimo: dto.stockMinimo ?? '0',
        esSerializado: dto.esSerializado ?? false,
        moneda: dto.moneda?.toUpperCase(),
        estaActiva: dto.estaActiva ?? true,
      }));
      if (!saved.esSerializado) {
        const existencias = manager.getRepository(ExistenciaRepuesto);
        await existencias.save(existencias.create({
          empresaId: user.empresaId,
          piezaRepuestoId: saved.id,
          cantidadDisponible: '0.0000',
          cantidadReservada: '0.0000',
        }));
      }
      await this.audit(user, 'PIEZAS_REPUESTOS_CREAR', saved.id, null, saved, manager);
      return saved;
    });
  }

  findAll(user: AuthenticatedUser) {
    return this.piezas.find({ where: { empresaId: user.empresaId }, order: { nombreComercial: 'ASC' } });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.piezas.findOne({ where: { id, empresaId: user.empresaId } });
    if (!item) throw new NotFoundException('Pieza de repuesto no encontrada');
    return item;
  }

  async update(id: string, dto: UpdatePiezasRepuestoDto, user: AuthenticatedUser) {
    this.validateNumbers(dto);
    return this.dataSource.transaction(async manager => {
      const piezas = manager.getRepository(PiezaRepuesto);
      const actual = await piezas.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual) throw new NotFoundException('Pieza de repuesto no encontrada');
      if (
        (dto.especificacionTipoActivoId !== undefined && dto.especificacionTipoActivoId !== actual.especificacionTipoActivoId)
        || (dto.esSerializado !== undefined && dto.esSerializado !== actual.esSerializado)
      ) {
        await this.ensureIdentityMutable(actual, user, manager);
      }
      if (dto.estaActiva === false && actual.estaActiva) await this.ensureNoActiveReservations(actual, user, manager);
      if (dto.especificacionTipoActivoId) await this.validateSpecification(dto.especificacionTipoActivoId, user, manager);
      const codigo = dto.codigo?.trim().toUpperCase();
      if (codigo && codigo !== actual.codigo && await piezas.findOne({ where: { empresaId: user.empresaId, codigo } })) {
        throw new BadRequestException('Ya existe una pieza con ese código');
      }
      const before = { ...actual };
      const saved = await piezas.save(piezas.merge(actual, {
        ...dto,
        codigo: codigo ?? actual.codigo,
        nombreComercial: dto.nombreComercial?.trim() ?? actual.nombreComercial,
        moneda: dto.moneda?.toUpperCase() ?? actual.moneda,
      }));
      await this.audit(user, 'PIEZAS_REPUESTOS_ACTUALIZAR', saved.id, before, saved, manager);
      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    return this.dataSource.transaction(async manager => {
      const piezas = manager.getRepository(PiezaRepuesto);
      const actual = await piezas.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual) throw new NotFoundException('Pieza de repuesto no encontrada');
      await this.ensureNoActiveReservations(actual, user, manager);
      actual.estaActiva = false;
      const saved = await piezas.save(actual);
      await this.audit(user, 'PIEZAS_REPUESTOS_DESACTIVAR', saved.id, { estaActiva: true }, { estaActiva: false }, manager);
      return saved;
    });
  }

  async findApplicable(activoId: string, user: AuthenticatedUser) {
    const activo = await this.activos.findOne({ where: { id: activoId, empresaId: user.empresaId } });
    if (!activo) throw new NotFoundException('Activo no encontrado');
    const tipo = await this.tipos.findOne({ where: { id: activo.tipoActivoId, empresaId: user.empresaId } });
    if (!tipo) throw new NotFoundException('Tipo de activo no encontrado');
    const definitions = await this.especificaciones.find({ where: [
      { empresaId: user.empresaId, tipoActivoId: activo.tipoActivoId },
      ...(tipo.categoriaEquipoId ? [{ empresaId: user.empresaId, categoriaEquipoId: tipo.categoriaEquipoId }] : []),
    ] });
    if (!definitions.length) return [];
    return this.piezas.find({
      where: { empresaId: user.empresaId, especificacionTipoActivoId: In(definitions.map((item) => item.id)), estaActiva: true },
      order: { nombreComercial: 'ASC' },
    });
  }

  private async validateSpecification(id: string, user: AuthenticatedUser, manager?: EntityManager) {
    const repo = manager?.getRepository(EspecificacionTipoActivo) ?? this.especificaciones;
    if (!await repo.findOne({ where: { id, empresaId: user.empresaId } })) {
      throw new NotFoundException('Especificación no encontrada para la empresa');
    }
  }

  private validateNumbers(dto: Partial<CreatePiezasRepuestoDto>) {
    if (dto.stockMinimo !== undefined && Number(dto.stockMinimo) < 0) throw new BadRequestException('El stock mínimo no puede ser negativo');
    if (dto.costoReferencial !== undefined && Number(dto.costoReferencial) < 0) throw new BadRequestException('El costo referencial no puede ser negativo');
    if (dto.capacidad !== undefined && Number(dto.capacidad) < 0) throw new BadRequestException('La capacidad no puede ser negativa');
  }

  private async ensureIdentityMutable(actual: PiezaRepuesto, user: AuthenticatedUser, manager: EntityManager) {
    const scope = { empresaId: user.empresaId, piezaRepuestoId: actual.id };
    const [stock, unit, movement, component] = await Promise.all([
      manager.getRepository(ExistenciaRepuesto).findOne({ where: scope }),
      manager.getRepository(UnidadRepuesto).findOne({ where: scope }),
      manager.getRepository(MovimientoRepuesto).findOne({ where: scope }),
      manager.getRepository(ComponenteInstaladoActivo).findOne({ where: scope }),
    ]);
    if (stock || unit || movement || component) {
      throw new BadRequestException('La especificación y serialización son inmutables cuando la pieza ya tiene historial de inventario');
    }
  }

  private async ensureNoActiveReservations(actual: PiezaRepuesto, user: AuthenticatedUser, manager: EntityManager) {
    const reservedUnit = await manager.getRepository(UnidadRepuesto).findOne({
      where: { empresaId: user.empresaId, piezaRepuestoId: actual.id, estado: 'reservada' },
    });
    const stock = await manager.getRepository(ExistenciaRepuesto).findOne({
      where: { empresaId: user.empresaId, piezaRepuestoId: actual.id },
      lock: { mode: 'pessimistic_write' },
    });
    if (reservedUnit || Number(stock?.cantidadReservada ?? 0) > 0) {
      throw new BadRequestException('No se puede desactivar una pieza con reservas activas');
    }
  }

  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown, manager?: EntityManager) {
    const repo = manager?.getRepository(BitacoraAuditoriaSistema) ?? this.bitacora;
    await repo.save(repo.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'piezas_repuestos', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' }));
  }
}
