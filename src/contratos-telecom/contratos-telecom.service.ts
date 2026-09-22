import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateContratosTelecomDto } from './dto/create-contratos-telecom.dto';
import { UpdateContratosTelecomDto } from './dto/update-contratos-telecom.dto';
import { ContratoTelecom } from './entities/contratos-telecom.entity';
import { Operadora } from '../operadoras/entities/operadora.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ContratosTelecomService {
  constructor(
    @InjectRepository(ContratoTelecom) private readonly contratos: Repository<ContratoTelecom>,
    @InjectRepository(Operadora) private readonly operadoras: Repository<Operadora>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema) private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(dto: CreateContratosTelecomDto, user: AuthenticatedUser) {
    await this.validarActor(user)
    await this.validarOperadora(dto.operadoraId, user.empresaId)
    await this.validarCodigo(dto.codigo, user.empresaId)
    const saved = await this.contratos.save(this.contratos.create({ ...dto, empresaId: user.empresaId, codigo: dto.codigo.trim().toUpperCase(), diaRenovacion: dto.diaRenovacion ?? 1, estado: dto.estado ?? 'borrador' }))
    await this.audit(user, 'CONTRATOS_TELECOM_CREAR', saved.id, null, saved)
    return saved
  }

  findAll(user: AuthenticatedUser) {
    return this.contratos.find({ where: { empresaId: user.empresaId }, order: { createdAt: 'DESC' } })
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.contratos.findOne({ where: { id, empresaId: user.empresaId } })
    if (!item) throw new NotFoundException('Contrato Telecom no encontrado')
    return item
  }

  async update(id: string, dto: UpdateContratosTelecomDto, user: AuthenticatedUser) {
    const actual = await this.findOne(id, user)
    if (dto.operadoraId) await this.validarOperadora(dto.operadoraId, user.empresaId)
    if (dto.codigo && dto.codigo.trim().toUpperCase() !== actual.codigo) await this.validarCodigo(dto.codigo, user.empresaId, id)
    const saved = await this.contratos.save(this.contratos.merge(actual, { ...dto, codigo: dto.codigo?.trim().toUpperCase() ?? actual.codigo }))
    await this.audit(user, 'CONTRATOS_TELECOM_ACTUALIZAR', saved.id, actual, saved)
    return saved
  }

  async remove(id: string, user: AuthenticatedUser) {
    const actual = await this.findOne(id, user)
    actual.estado = 'finalizado'
    await this.contratos.save(actual)
    await this.audit(user, 'CONTRATOS_TELECOM_FINALIZAR', actual.id, { estado: 'activo' }, { estado: actual.estado })
  }

  private async validarOperadora(id: string, empresaId: string) { if (!await this.operadoras.findOne({ where: { id, empresaId, estaActiva: true } })) throw new BadRequestException('La operadora no existe o no está activa') }
  private async validarCodigo(codigo: string, empresaId: string, excludeId?: string) { const found = await this.contratos.findOne({ where: { empresaId, codigo: codigo.trim().toUpperCase() } }); if (found && found.id !== excludeId) throw new BadRequestException('Ya existe un contrato Telecom con ese código') }
  private async validarActor(user: AuthenticatedUser) { if (!await this.usuarios.findOne({ where: { id: user.userId, empresaId: user.empresaId, deletedAt: IsNull() } })) throw new NotFoundException('Usuario actor no encontrado') }
  private async audit(user: AuthenticatedUser, accion: string, id: string, before: unknown, after: unknown) { await this.bitacora.save(this.bitacora.create({ empresaId: user.empresaId, usuarioActorId: user.userId, accion, entidad: 'contratos_telecom', entidadId: id, valoresAnteriores: before as Record<string, unknown> ?? undefined, valoresNuevos: after as Record<string, unknown> ?? undefined, resultado: 'exito' })) }
}
