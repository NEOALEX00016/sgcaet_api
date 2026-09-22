import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CreateUnidadesRepuestoDto } from './dto/create-unidades-repuesto.dto';
import { EstadoUnidadRepuesto, UnidadRepuesto } from './entities/unidades-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { MovimientoRepuesto } from '../movimientos-repuestos/entities/movimientos-repuesto.entity';

@Injectable()
export class UnidadesRepuestosService {
  constructor(
    @InjectRepository(UnidadRepuesto) private readonly unidades: Repository<UnidadRepuesto>,
    @InjectRepository(PiezaRepuesto) private readonly piezas: Repository<PiezaRepuesto>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateUnidadesRepuestoDto, user: AuthenticatedUser) {
    const numeroSerie = dto.numeroSerie.trim().toUpperCase();
    if (dto.costoEntrada !== undefined && Number(dto.costoEntrada) < 0) throw new BadRequestException('El costo de entrada no puede ser negativo');
    return this.dataSource.transaction(async (manager) => {
      const piezaRepo = manager.getRepository(PiezaRepuesto);
      const unidadRepo = manager.getRepository(UnidadRepuesto);
      const pieza = await piezaRepo.findOne({ where: { id: dto.piezaRepuestoId, empresaId: user.empresaId, estaActiva: true }, lock: { mode: 'pessimistic_write' } });
      if (!pieza) throw new NotFoundException('Pieza de repuesto no encontrada');
      if (!pieza.esSerializado) throw new BadRequestException('La pieza no usa control serializado');
      if (await unidadRepo.findOne({ where: { empresaId: user.empresaId, numeroSerie } })) throw new BadRequestException('Ya existe una unidad con ese serial');
      const saved = await unidadRepo.save(unidadRepo.create({ ...dto, empresaId: user.empresaId, numeroSerie, estado: 'disponible', moneda: dto.moneda?.toUpperCase() }));
      const movementRepo = manager.getRepository(MovimientoRepuesto);
      await movementRepo.save(movementRepo.create({ empresaId: user.empresaId, piezaRepuestoId: pieza.id, unidadRepuestoId: saved.id, tipoMovimiento: 'entrada', cantidad: '1', creadoPor: user.userId }));
      const auditRepo = manager.getRepository(BitacoraAuditoriaSistema);
      await auditRepo.save(auditRepo.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion: 'UNIDADES_REPUESTOS_CREAR', entidad: 'unidades_repuestos', entidadId: saved.id, valoresNuevos: saved as unknown as Record<string, unknown>, resultado: 'exito' }));
      return saved;
    });
  }

  findAll(user: AuthenticatedUser, piezaRepuestoId?: string, estado?: string) {
    const estados = ['disponible', 'reservada', 'instalada', 'defectuosa', 'baja'];
    if (estado && !estados.includes(estado)) throw new BadRequestException('Estado de unidad inválido');
    return this.unidades.find({ where: { empresaId: user.empresaId, ...(piezaRepuestoId ? { piezaRepuestoId } : {}), ...(estado ? { estado: estado as EstadoUnidadRepuesto } : {}) }, order: { createdAt: 'DESC' } });
  }
}
