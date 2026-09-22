import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateAsignacionesLineaPersonaDto } from './dto/create-asignaciones-linea-persona.dto';
import { UpdateAsignacionesLineaPersonaDto } from './dto/update-asignaciones-linea-persona.dto';
import { AsignacionLineaPersona } from './entities/asignaciones-linea-persona.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AsignacionesLineaPersonaService {
  constructor(@InjectRepository(AsignacionLineaPersona) private readonly asignaciones: Repository<AsignacionLineaPersona>, @InjectRepository(LineaTelefonica) private readonly lineas: Repository<LineaTelefonica>, @InjectRepository(Persona) private readonly personas: Repository<Persona>, @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>, @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>) {}
  async create(dto: CreateAsignacionesLineaPersonaDto, user: AuthenticatedUser) {
    await this.actor(user); const line = await this.lineas.findOne({ where: { id: dto.lineaTelefonicaId, empresaId: user.empresaId, estaActiva: true } }); if (!line) throw new NotFoundException('Línea no disponible');
    if (!dto.personaId && !dto.departamentoId) throw new BadRequestException('La asignación requiere persona o departamento');
    if (dto.personaId && dto.departamentoId) throw new BadRequestException('La asignación no puede tener persona y departamento simultáneamente');
    if (dto.personaId && !await this.personas.findOne({ where: { id: dto.personaId, empresaId: user.empresaId, estado: 'activo', deletedAt: IsNull() } })) throw new NotFoundException('Persona no disponible');
    const active = await this.asignaciones.findOne({ where: { empresaId: user.empresaId, lineaTelefonicaId: dto.lineaTelefonicaId, estado: 'activa' } }); if (active) throw new BadRequestException('La línea ya tiene una asignación activa');
    if (dto.terminaEn && new Date(dto.terminaEn) <= new Date(dto.iniciaEn)) throw new BadRequestException('terminaEn debe ser posterior a iniciaEn');
    const saved = await this.asignaciones.save(this.asignaciones.create({ ...dto, empresaId: user.empresaId, iniciaEn: new Date(dto.iniciaEn), terminaEn: dto.terminaEn ? new Date(dto.terminaEn) : undefined, estado: dto.estado ?? 'activa' })); await this.audit(user, 'ASIGNACIONES_LINEA_PERSONA_CREAR', saved.id, null, saved); return saved;
  }

  findAll(user: AuthenticatedUser) { return this.asignaciones.find({ where: { empresaId: user.empresaId }, order: { createdAt: 'DESC' } }); }
  async findOne(id: string, user: AuthenticatedUser) { const item = await this.asignaciones.findOne({ where: { id, empresaId: user.empresaId } }); if (!item) throw new NotFoundException('Asignación de línea no encontrada'); return item; }
  async update(id: string, dto: UpdateAsignacionesLineaPersonaDto, user: AuthenticatedUser) { const actual = await this.findOne(id, user); const saved = await this.asignaciones.save(this.asignaciones.merge(actual, dto)); await this.audit(user, 'ASIGNACIONES_LINEA_PERSONA_ACTUALIZAR', saved.id, actual, saved); return saved; }
  async remove(id: string, user: AuthenticatedUser) { const actual = await this.findOne(id, user); actual.estado = 'finalizada'; const saved = await this.asignaciones.save(actual); await this.audit(user, 'ASIGNACIONES_LINEA_PERSONA_FINALIZAR', saved.id, actual, saved); return saved; }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Actor no encontrado'); }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'asignaciones_linea_persona', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })); }
}
