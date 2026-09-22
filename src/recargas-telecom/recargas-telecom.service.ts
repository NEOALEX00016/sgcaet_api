import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { CreateRecargasTelecomDto } from './dto/create-recargas-telecom.dto';
import { UpdateRecargasTelecomDto } from './dto/update-recargas-telecom.dto';
import { RecargaTelecom } from './entities/recargas-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PoliticaRecargaTelecom } from '../politicas-recarga-telecom/entities/politicas-recarga-telecom.entity';
import { CapacidadPoolTelecom } from '../pools-telecom/entities/capacidades-pool-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { MovimientosTelecom } from '../movimientos-telecom/entities/movimientos-telecom.entity';
import { ReglasNegocioService } from '../reglas-negocio/reglas-negocio.service';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class RecargasTelecomService {
  constructor(@InjectRepository(RecargaTelecom) private readonly recargas: Repository<RecargaTelecom>, @InjectRepository(LineaTelefonica) private readonly lineas: Repository<LineaTelefonica>, @InjectRepository(PoliticaRecargaTelecom) private readonly politicas: Repository<PoliticaRecargaTelecom>, @InjectRepository(CapacidadPoolTelecom) private readonly capacidades: Repository<CapacidadPoolTelecom>, @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>, @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>, @InjectRepository(MovimientosTelecom) private readonly movimientos: Repository<MovimientosTelecom>, private readonly dataSource: DataSource, private readonly reglas: ReglasNegocioService) {}
  async create(dto: CreateRecargasTelecomDto, user: AuthenticatedUser) {
    await this.actor(user);
    const line = await this.lineas.findOne({ where: { id: dto.lineaTelefonicaId, empresaId: user.empresaId, estaActiva: true } }); if (!line) throw new NotFoundException('Línea no disponible');
    const existing = await this.recargas.findOne({ where: { empresaId: user.empresaId, claveIdempotencia: dto.claveIdempotencia } }); if (existing) { if (existing.cantidad !== dto.cantidad || existing.tipoCapacidad !== dto.tipoCapacidad) throw new ConflictException('La clave de idempotencia ya fue usada con otro payload'); return existing; }
    const policies = await this.politicas.find({ where: { empresaId: user.empresaId, estado: 'activa' } });
    const matches = policies.filter((candidate) => candidate.tiposCapacidad.includes(dto.tipoCapacidad));
    if (!matches.length) throw new BadRequestException('No existe política activa para esta capacidad');
    const policy = matches.find((candidate) => candidate.alcanceTipo === 'linea' && candidate.alcanceId === dto.lineaTelefonicaId) ?? matches.find((candidate) => candidate.alcanceTipo === 'tenant');
    if (!policy) throw new ConflictException('Existen políticas activas ambiguas para la recarga; configure un alcance específico o suspenda una política');
    const rule = await this.reglas.evaluate(user, 'telecom', 'telecom.recarga.elegibilidad', { linea: dto.lineaTelefonicaId }, new Date(), { entidadTipo: 'recargas_telecom' });
    if (rule.configuracion.permitida === false) throw new BadRequestException('La regla de negocio no permite esta recarga');
    if (policy.limiteCantidad && Number(dto.cantidad) > Number(policy.limiteCantidad)) throw new BadRequestException('La cantidad supera el límite configurado');
    const saved = await this.recargas.save(this.recargas.create({ ...dto, empresaId: user.empresaId, politicaRecargaId: policy.id, requiereAprobacion: policy.requiereAprobacion, estado: policy.requiereAprobacion ? 'solicitada' : 'aprobada', solicitadoPor: user.userId })); await this.audit(user, 'RECARGAS_TELECOM_CREAR', saved.id, null, saved); return saved;
  }
  findAll(user: AuthenticatedUser) { return this.recargas.find({ where: { empresaId: user.empresaId }, order: { createdAt: 'DESC' } }); }
  async findOne(id: string, user: AuthenticatedUser) { const item = await this.recargas.findOne({ where: { id, empresaId: user.empresaId } }); if (!item) throw new NotFoundException('Recarga no encontrada'); return item; }
  async approve(id: string, user: AuthenticatedUser) { const item = await this.findOne(id, user); if (item.estado !== 'solicitada') throw new BadRequestException('Solo se pueden aprobar recargas solicitadas'); item.estado = 'aprobada'; item.aprobadoPor = user.userId; item.aprobadaEn = new Date(); const saved = await this.recargas.save(item); await this.audit(user, 'RECARGAS_TELECOM_APROBAR', saved.id, { estado: 'solicitada' }, saved); return saved; }
  async reject(id: string, user: AuthenticatedUser) { const item = await this.findOne(id, user); if (!['solicitada', 'aprobada'].includes(item.estado)) throw new BadRequestException('La recarga no puede rechazarse en su estado actual'); item.estado = 'rechazada'; const saved = await this.recargas.save(item); await this.audit(user, 'RECARGAS_TELECOM_RECHAZAR', saved.id, { estado: item.estado }, saved); return saved; }
  async apply(id: string, user: AuthenticatedUser) {
    return this.dataSource.transaction(async (manager) => {
      const rechargeRepo = manager.getRepository(RecargaTelecom);
      const capacityRepo = manager.getRepository(CapacidadPoolTelecom);
      const movementRepo = manager.getRepository(MovimientosTelecom);
      const auditRepo = manager.getRepository(BitacoraAuditoriaSistema);
      const item = await rechargeRepo.findOne({ where: { id, empresaId: user.empresaId }, lock: { mode: 'pessimistic_write' } });
      if (!item) throw new NotFoundException('Recarga no encontrada');
      if (item.estado === 'aplicada') return item;
      if (item.estado !== 'aprobada') throw new BadRequestException('Solo se pueden aplicar recargas aprobadas');
      const capacity = item.capacidadPoolId ? await capacityRepo.findOne({ where: { id: item.capacidadPoolId, empresaId: user.empresaId }, lock: { mode: 'pessimistic_write' } }) : null;
      if (!capacity) throw new BadRequestException('La recarga no tiene capacidad de pool asignada');
      const available = Number(capacity.cantidadContratada) + Number(capacity.cantidadRolloverActual) - Number(capacity.cantidadAsignada) - Number(capacity.cantidadConsumida);
      if (available < Number(item.cantidad)) throw new BadRequestException('Capacidad insuficiente en el pool');
      capacity.cantidadConsumida = (Number(capacity.cantidadConsumida) + Number(item.cantidad)).toFixed(4);
      await capacityRepo.save(capacity);
      const movement = movementRepo.create({ empresaId: user.empresaId, lineaTelefonicaId: item.lineaTelefonicaId, tipoMovimiento: 'recarga', cantidad: item.cantidad, unidad: item.unidad, claveIdempotencia: `recarga:${item.id}`, descripcion: `Recarga aplicada ${item.id}`, ocurridoEn: new Date() });
      await movementRepo.save(movement);
      item.estado = 'aplicada'; item.aplicadaEn = new Date(); item.capacidadPoolId = capacity.id;
      const saved = await rechargeRepo.save(item);
      await auditRepo.save(auditRepo.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion: 'RECARGAS_TELECOM_APLICAR', entidad: 'recargas_telecom', entidadId: saved.id, valoresAnteriores: { estado: 'aprobada' }, valoresNuevos: saved as unknown as Record<string, unknown>, resultado: 'exito' }));
      return saved;
    });
  }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Actor no encontrado'); }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'recargas_telecom', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })); }
}
