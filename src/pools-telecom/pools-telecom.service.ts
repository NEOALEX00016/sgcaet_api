import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreatePoolsTelecomDto } from './dto/create-pools-telecom.dto';
import { UpdatePoolsTelecomDto } from './dto/update-pools-telecom.dto';
import { CreateCapacidadPoolTelecomDto } from './dto/create-capacidad-pool-telecom.dto';
import { PoolTelecom } from './entities/pools-telecom.entity';
import { CapacidadPoolTelecom } from './entities/capacidades-pool-telecom.entity';
import { ContratoTelecom } from '../contratos-telecom/entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PoolsTelecomService {
  constructor(
    @InjectRepository(PoolTelecom) private readonly pools: Repository<PoolTelecom>,
    @InjectRepository(CapacidadPoolTelecom) private readonly capacidades: Repository<CapacidadPoolTelecom>,
    @InjectRepository(ContratoTelecom) private readonly contratos: Repository<ContratoTelecom>,
    @InjectRepository(Operadora) private readonly operadoras: Repository<Operadora>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(dto: CreatePoolsTelecomDto, user: AuthenticatedUser) {
    await this.actor(user);
    const contrato = await this.contratos.findOne({ where: { id: dto.contratoTelecomId, empresaId: user.empresaId } });
    if (!contrato || contrato.estado === 'finalizado') throw new BadRequestException('Contrato Telecom no disponible');
    const operadora = await this.operadoras.findOne({ where: { id: dto.operadoraId, empresaId: user.empresaId, estaActiva: true } });
    if (!operadora || operadora.id !== contrato.operadoraId) throw new BadRequestException('La operadora no coincide con el contrato');
    const existing = await this.pools.findOne({ where: { empresaId: user.empresaId, codigo: dto.codigo.trim().toUpperCase() } });
    if (existing) throw new BadRequestException('Ya existe un pool Telecom con ese código');
    const saved = await this.pools.save(this.pools.create({ ...dto, empresaId: user.empresaId, codigo: dto.codigo.trim().toUpperCase(), diaRenovacion: dto.diaRenovacion ?? contrato.diaRenovacion, heredaDiaRenovacion: dto.heredaDiaRenovacion ?? true, zonaHoraria: dto.zonaHoraria ?? 'America/Santo_Domingo', estado: dto.estado ?? 'borrador' }));
    await this.audit(user, 'POOLS_TELECOM_CREAR', saved.id, null, saved);
    return saved;
  }

  findAll(user: AuthenticatedUser) { return this.pools.find({ where: { empresaId: user.empresaId }, order: { createdAt: 'DESC' } }); }

  async findOne(id: string, user: AuthenticatedUser) { const item = await this.pools.findOne({ where: { id, empresaId: user.empresaId } }); if (!item) throw new NotFoundException('Pool Telecom no encontrado'); return item; }

  async getCapacidades(poolId: string, user: AuthenticatedUser) { await this.findOne(poolId, user); return this.capacidades.find({ where: { poolTelecomId: poolId, empresaId: user.empresaId }, order: { tipoCapacidad: 'ASC' } }); }

  async addCapacidad(poolId: string, dto: CreateCapacidadPoolTelecomDto, user: AuthenticatedUser) {
    await this.findOne(poolId, user);
    if (Number(dto.cantidadContratada) < 0 || (dto.cantidadRolloverMaxima && Number(dto.cantidadRolloverMaxima) < 0)) throw new BadRequestException('Las capacidades no pueden ser negativas');
    if (!dto.rolloverHabilitado && dto.cantidadRolloverMaxima) throw new BadRequestException('El rollover máximo requiere rolloverHabilitado');
    const existing = await this.capacidades.findOne({ where: { empresaId: user.empresaId, poolTelecomId: poolId, tipoCapacidad: dto.tipoCapacidad } });
    if (existing) throw new BadRequestException('Ya existe esa capacidad en el pool');
    const saved = await this.capacidades.save(this.capacidades.create({ ...dto, empresaId: user.empresaId, poolTelecomId: poolId, rolloverHabilitado: dto.rolloverHabilitado ?? false, cantidadRolloverActual: '0', cantidadAsignada: '0', cantidadConsumida: '0', estaActiva: true }));
    await this.audit(user, 'CAPACIDADES_POOL_TELECOM_CREAR', saved.id, null, saved);
    return saved;
  }
  async updateCapacidad(poolId: string, id: string, dto: Partial<CreateCapacidadPoolTelecomDto>, user: AuthenticatedUser) { await this.findOne(poolId, user); const actual = await this.capacidades.findOne({ where: { id, poolTelecomId: poolId, empresaId: user.empresaId } }); if (!actual) throw new NotFoundException('Capacidad no encontrada'); const saved = await this.capacidades.save(this.capacidades.merge(actual, dto)); await this.audit(user, 'CAPACIDADES_POOL_TELECOM_ACTUALIZAR', saved.id, actual, saved); return saved; }
  async removeCapacidad(poolId: string, id: string, user: AuthenticatedUser) { await this.findOne(poolId, user); const actual = await this.capacidades.findOne({ where: { id, poolTelecomId: poolId, empresaId: user.empresaId } }); if (!actual) throw new NotFoundException('Capacidad no encontrada'); actual.estaActiva = false; const saved = await this.capacidades.save(actual); await this.audit(user, 'CAPACIDADES_POOL_TELECOM_DESHABILITAR', saved.id, actual, saved); return saved; }

  async update(id: string, dto: UpdatePoolsTelecomDto, user: AuthenticatedUser) { const actual = await this.findOne(id, user); if (actual.estado !== 'borrador' && (dto.contratoTelecomId || dto.operadoraId || dto.codigo)) throw new BadRequestException('No se pueden cambiar contrato, operadora o código de un pool no borrador'); const saved = await this.pools.save(this.pools.merge(actual, dto)); await this.audit(user, 'POOLS_TELECOM_ACTUALIZAR', saved.id, actual, saved); return saved; }
  async remove(id: string, user: AuthenticatedUser) { const actual = await this.findOne(id, user); actual.estado = 'finalizado'; const saved = await this.pools.save(actual); await this.audit(user, 'POOLS_TELECOM_FINALIZAR', saved.id, actual, saved); return saved; }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Usuario actor no encontrado'); }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'pools_telecom', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })); }
}
