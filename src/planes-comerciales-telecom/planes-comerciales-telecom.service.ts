import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreatePlanesComercialesTelecomDto } from './dto/create-planes-comerciales-telecom.dto';
import { UpdatePlanesComercialesTelecomDto } from './dto/update-planes-comerciales-telecom.dto';
import { PlanComercialTelecom } from './entities/planes-comerciales-telecom.entity';
import { PoolTelecom } from '../pools-telecom/entities/pools-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PlanesComercialesTelecomService {
  constructor(
    @InjectRepository(PlanComercialTelecom) private readonly planes: Repository<PlanComercialTelecom>,
    @InjectRepository(PoolTelecom) private readonly pools: Repository<PoolTelecom>,
    @InjectRepository(Operadora) private readonly operadoras: Repository<Operadora>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(dto: CreatePlanesComercialesTelecomDto, user: AuthenticatedUser) {
    await this.actor(user);
    const pool = await this.pools.findOne({ where: { id: dto.poolTelecomId, empresaId: user.empresaId } });
    if (!pool || pool.estado === 'finalizado') throw new BadRequestException('Pool Telecom no disponible');
    if (pool.operadoraId !== dto.operadoraId) throw new BadRequestException('La operadora no coincide con el pool');
    if ([dto.minutosIncluidos, dto.datosIncluidos, dto.smsIncluidos].some(value => value !== undefined && Number(value) < 0)) throw new BadRequestException('Las capacidades del plan no pueden ser negativas');
    const existing = await this.planes.findOne({ where: { empresaId: user.empresaId, codigo: dto.codigo.trim().toUpperCase() } });
    if (existing) throw new BadRequestException('Ya existe un plan comercial con ese código');
    const saved = await this.planes.save(this.planes.create({ ...dto, empresaId: user.empresaId, codigo: dto.codigo.trim().toUpperCase(), minutosIncluidos: dto.minutosIncluidos ?? '0', datosIncluidos: dto.datosIncluidos ?? '0', datosUnidad: dto.datosUnidad ?? 'mb', smsIncluidos: dto.smsIncluidos ?? '0', moneda: dto.moneda?.toUpperCase() ?? 'DOP', estaActivo: dto.estaActivo ?? true }));
    await this.audit(user, 'PLANES_COMERCIALES_TELECOM_CREAR', saved.id, null, saved);
    return saved;
  }

  findAll(user: AuthenticatedUser, poolTelecomId?: string) { return this.planes.find({ where: { empresaId: user.empresaId, ...(poolTelecomId ? { poolTelecomId } : {}) }, order: { createdAt: 'DESC' } }); }
  async findOne(id: string, user: AuthenticatedUser) { const item = await this.planes.findOne({ where: { id, empresaId: user.empresaId } }); if (!item) throw new NotFoundException('Plan comercial Telecom no encontrado'); return item; }
  async update(id: string, dto: UpdatePlanesComercialesTelecomDto, user: AuthenticatedUser) { const actual = await this.findOne(id, user); if (dto.poolTelecomId || dto.operadoraId) throw new BadRequestException('No se puede cambiar el pool u operadora de un plan existente'); const saved = await this.planes.save(this.planes.merge(actual, dto)); await this.audit(user, 'PLANES_COMERCIALES_TELECOM_ACTUALIZAR', saved.id, actual, saved); return saved; }
  async remove(id: string, user: AuthenticatedUser) { const actual = await this.findOne(id, user); actual.estaActivo = false; const saved = await this.planes.save(actual); await this.audit(user, 'PLANES_COMERCIALES_TELECOM_DESACTIVAR', saved.id, actual, saved); return saved; }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Usuario actor no encontrado'); }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'planes_comerciales_telecom', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })); }
}
