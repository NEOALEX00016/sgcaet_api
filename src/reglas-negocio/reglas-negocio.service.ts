import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateReglasNegocioDto } from './dto/create-reglas-negocio.dto';
import { QueryEvaluacionesReglasDto } from './dto/query-evaluaciones-reglas.dto';
import { UpdateReglasNegocioDto } from './dto/update-reglas-negocio.dto';
import { ReglaNegocio } from './entities/reglas-negocio.entity';
import { EvaluacionReglaNegocio } from './entities/evaluacion-regla-negocio.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

export type RuleEvaluationContext = Partial<Record<'contrato' | 'operadora' | 'plan' | 'linea' | 'persona' | 'departamento' | 'vehiculo' | 'categoria', string>>;
export type RuleEvaluationResult = { reglaId: string; reglaVersion: number; dominio: string; clave: string; alcanceTipo: string; alcanceId?: string; configuracion: Record<string, unknown>; prioridad: number; evaluadaEn: string };
export type RuleEvaluationOptions = { entidadTipo?: string; entidadId?: string; resultado?: Record<string, unknown> };

@Injectable()
export class ReglasNegocioService {
  constructor(
    @InjectRepository(ReglaNegocio) private readonly reglas: Repository<ReglaNegocio>,
    @InjectRepository(EvaluacionReglaNegocio) private readonly evaluaciones: Repository<EvaluacionReglaNegocio>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(dto: CreateReglasNegocioDto, user: AuthenticatedUser) {
    await this.actor(user)
    this.validateDates(dto.vigenteDesde, dto.vigenteHasta)
    const saved = await this.reglas.save(this.reglas.create({ ...dto, empresaId: user.empresaId, alcanceTipo: dto.alcanceTipo ?? 'tenant', prioridad: dto.prioridad ?? 0, estado: dto.estado ?? 'borrador', version: 1, vigenteDesde: dto.vigenteDesde ? new Date(dto.vigenteDesde) : undefined, vigenteHasta: dto.vigenteHasta ? new Date(dto.vigenteHasta) : undefined }))
    await this.audit(user, 'REGLAS_NEGOCIO_CREAR', saved.id, null, saved)
    return saved
  }

  findAll(user: AuthenticatedUser, dominio?: string) {
    return this.reglas.find({ where: { empresaId: user.empresaId, ...(dominio ? { dominio } : {}) }, order: { prioridad: 'DESC', createdAt: 'DESC' } })
  }

  async evaluate(user: AuthenticatedUser, dominio: string, clave: string, context: RuleEvaluationContext = {}, at = new Date(), options: RuleEvaluationOptions = {}): Promise<RuleEvaluationResult> {
    const candidates = (await this.reglas.find({ where: { empresaId: user.empresaId, dominio, clave, estado: 'activa' } })).filter(rule => {
      const inPeriod = (!rule.vigenteDesde || rule.vigenteDesde <= at) && (!rule.vigenteHasta || rule.vigenteHasta >= at)
      const inScope = rule.alcanceTipo === 'tenant' || (!!rule.alcanceId && context[rule.alcanceTipo as keyof RuleEvaluationContext] === rule.alcanceId)
      return inPeriod && inScope
    })
    if (!candidates.length) throw new NotFoundException(`No existe regla activa para ${dominio}.${clave}`)
    const specificity = (rule: ReglaNegocio) => rule.alcanceTipo === 'tenant' ? 0 : 1
    candidates.sort((left, right) => specificity(right) - specificity(left) || right.prioridad - left.prioridad || right.version - left.version || right.updatedAt.getTime() - left.updatedAt.getTime())
    const selected = candidates[0]
    const ties = candidates.filter(rule => specificity(rule) === specificity(selected) && rule.prioridad === selected.prioridad && rule.version === selected.version)
    if (ties.length > 1) throw new BadRequestException('RULE_CONFLICT: existen reglas activas equivalentes para el mismo contexto')
    const evaluation = { reglaId: selected.id, reglaVersion: selected.version, dominio: selected.dominio, clave: selected.clave, alcanceTipo: selected.alcanceTipo, alcanceId: selected.alcanceId, configuracion: selected.configuracion, prioridad: selected.prioridad, evaluadaEn: at.toISOString() }
    await this.evaluaciones.save(this.evaluaciones.create({ empresaId: user.empresaId, reglaId: selected.id, reglaVersion: selected.version, dominio: selected.dominio, clave: selected.clave, alcanceTipo: selected.alcanceTipo, alcanceId: selected.alcanceId, contexto: context, configuracionResultante: selected.configuracion, resultado: options.resultado, entidadTipo: options.entidadTipo, entidadId: options.entidadId, usuarioActorId: user.userId, evaluadaEn: at }))
    return evaluation
  }

  async findEvaluations(user: AuthenticatedUser, query: QueryEvaluacionesReglasDto) {
    const page = query.pagina ?? 1;
    const limit = query.limite ?? 20;
    const qb = this.evaluaciones.createQueryBuilder('evaluacion')
      .where('evaluacion.empresa_id = :empresaId', { empresaId: user.empresaId });
    if (query.dominio) qb.andWhere('evaluacion.dominio = :dominio', { dominio: query.dominio });
    if (query.clave) qb.andWhere('evaluacion.clave = :clave', { clave: query.clave });
    if (query.reglaId) qb.andWhere('evaluacion.regla_id = :reglaId', { reglaId: query.reglaId });
    if (query.entidadId) qb.andWhere('evaluacion.entidad_id = :entidadId', { entidadId: query.entidadId });
    if (query.entidadTipo) qb.andWhere('evaluacion.entidad_tipo = :entidadTipo', { entidadTipo: query.entidadTipo });
    if (query.desde) qb.andWhere('evaluacion.evaluada_en >= :desde', { desde: new Date(query.desde) });
    if (query.hasta) qb.andWhere('evaluacion.evaluada_en <= :hasta', { hasta: new Date(query.hasta) });
    qb.orderBy('evaluacion.evaluada_en', 'DESC').skip((page - 1) * limit).take(limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, pagina: page, limite: limit, totalPaginas: Math.max(1, Math.ceil(total / limit)) };
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.reglas.findOne({ where: { id, empresaId: user.empresaId } })
    if (!item) throw new NotFoundException('Regla de negocio no encontrada')
    return item
  }

  async update(id: string, dto: UpdateReglasNegocioDto, user: AuthenticatedUser) {
    const actual = await this.findOne(id, user)
    if (actual.estado === 'archivada') throw new BadRequestException('Una regla archivada no puede modificarse')
    this.validateDates(dto.vigenteDesde, dto.vigenteHasta)
    const previous = { ...actual, estado: 'archivada' }
    await this.reglas.save(previous)
    const { id: _oldId, ...definition } = actual
    const saved = await this.reglas.save(this.reglas.create({ ...definition, ...dto, empresaId: user.empresaId, version: actual.version + 1, estado: dto.estado ?? actual.estado, vigenteDesde: dto.vigenteDesde ? new Date(dto.vigenteDesde) : actual.vigenteDesde, vigenteHasta: dto.vigenteHasta ? new Date(dto.vigenteHasta) : actual.vigenteHasta }))
    await this.audit(user, 'REGLAS_NEGOCIO_ACTUALIZAR', saved.id, actual, saved)
    return saved
  }

  async remove(id: string, user: AuthenticatedUser) {
    const actual = await this.findOne(id, user)
    actual.estado = 'archivada'
    const saved = await this.reglas.save(actual)
    await this.audit(user, 'REGLAS_NEGOCIO_ARCHIVAR', saved.id, { estado: actual.estado }, { estado: saved.estado })
    return saved
  }

  private validateDates(from?: string, to?: string) { if (from && to && new Date(to) < new Date(from)) throw new BadRequestException('La vigencia final no puede ser anterior a la inicial') }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Usuario actor no encontrado') }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'reglas_negocio', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })) }
}
