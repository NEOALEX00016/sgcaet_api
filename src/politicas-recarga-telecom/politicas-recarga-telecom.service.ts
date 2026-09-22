import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreatePoliticasRecargaTelecomDto } from './dto/create-politicas-recarga-telecom.dto';
import { UpdatePoliticasRecargaTelecomDto } from './dto/update-politicas-recarga-telecom.dto';
import { PoliticaRecargaTelecom } from './entities/politicas-recarga-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PoliticasRecargaTelecomService {
  constructor(@InjectRepository(PoliticaRecargaTelecom) private readonly politicas: Repository<PoliticaRecargaTelecom>, @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>, @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>) {}
  async create(dto: CreatePoliticasRecargaTelecomDto, user: AuthenticatedUser) {
    await this.actor(user); this.validate(dto);
    const existing = await this.politicas.findOne({ where: { empresaId: user.empresaId, clave: dto.clave.trim().toLowerCase() } });
    if (existing) throw new BadRequestException('Ya existe una política con esa clave');
    const saved = await this.politicas.save(this.politicas.create({ ...dto, empresaId: user.empresaId, dominio: 'telecom', clave: dto.clave.trim().toLowerCase(), tiposCapacidad: dto.tiposCapacidad, alcanceTipo: dto.alcanceTipo ?? 'tenant', requiereAprobacion: dto.requiereAprobacion ?? true, estado: dto.estado ?? 'borrador', vigenteDesde: dto.vigenteDesde ? new Date(dto.vigenteDesde) : undefined, vigenteHasta: dto.vigenteHasta ? new Date(dto.vigenteHasta) : undefined }));
    await this.audit(user, 'POLITICAS_RECARGA_TELECOM_CREAR', saved.id, null, saved); return saved;
  }
  findAll(user: AuthenticatedUser) { return this.politicas.find({ where: { empresaId: user.empresaId }, order: { createdAt: 'DESC' } }); }
  async findOne(id: string, user: AuthenticatedUser) { const item = await this.politicas.findOne({ where: { id, empresaId: user.empresaId } }); if (!item) throw new NotFoundException('Política de recarga no encontrada'); return item; }
  async update(id: string, dto: UpdatePoliticasRecargaTelecomDto, user: AuthenticatedUser) { const actual = await this.findOne(id, user); if (actual.estado === 'archivada') throw new BadRequestException('La política archivada no puede modificarse'); this.validate(dto); const saved = await this.politicas.save(this.politicas.merge(actual, dto)); await this.audit(user, 'POLITICAS_RECARGA_TELECOM_ACTUALIZAR', saved.id, actual, saved); return saved; }
  async remove(id: string, user: AuthenticatedUser) { const actual = await this.findOne(id, user); actual.estado = 'archivada'; const saved = await this.politicas.save(actual); await this.audit(user, 'POLITICAS_RECARGA_TELECOM_ARCHIVAR', saved.id, actual, saved); return saved; }
  private validate(dto: CreatePoliticasRecargaTelecomDto | UpdatePoliticasRecargaTelecomDto) { if (dto.vigenteDesde && dto.vigenteHasta && new Date(dto.vigenteHasta) < new Date(dto.vigenteDesde)) throw new BadRequestException('Vigencia inválida'); if (dto.limiteCantidad && Number(dto.limiteCantidad) < 0) throw new BadRequestException('Límite inválido'); }
  private async actor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Actor no encontrado'); }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'politicas_recarga_telecom', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })); }
}
