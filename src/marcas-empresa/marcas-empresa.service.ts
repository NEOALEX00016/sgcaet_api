import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateMarcasEmpresaDto } from './dto/create-marcas-empresa.dto';
import { UpdateMarcasEmpresaDto } from './dto/update-marcas-empresa.dto';
import { MarcasEmpresa } from './entities/marcas-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class MarcasEmpresaService {
  constructor(
    @InjectRepository(MarcasEmpresa)
    private readonly repo: Repository<MarcasEmpresa>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly auditRepo: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    dto: CreateMarcasEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    if (await this.repo.findOne({ where: { empresaId: scopeEmpresaId } }))
      throw new BadRequestException(
        'La empresa ya tiene una marca configurada',
      );
    const saved = await this.repo.save(
      this.repo.create({ ...dto, empresaId: scopeEmpresaId }),
    );
    await this.audit(
      user,
      'MARCAS_EMPRESA_CREAR',
      saved.id,
      null,
      dto,
      scopeEmpresaId,
    );
    return saved;
  }
  findAll(user: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    return this.repo.find({ where: { empresaId: scopeEmpresaId } });
  }
  async findOne(id: string, user: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const item = await this.repo.findOne({
      where: { id, empresaId: scopeEmpresaId },
    });
    if (!item) throw new NotFoundException('Marca no encontrada');
    return item;
  }
  async update(
    id: string,
    dto: UpdateMarcasEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const item = await this.findOne(id, user, scopeEmpresaId);
    const before = { ...item };
    const saved = await this.repo.save(this.repo.merge(item, dto));
    await this.audit(
      user,
      'MARCAS_EMPRESA_ACTUALIZAR',
      id,
      before,
      dto,
      scopeEmpresaId,
    );
    return saved;
  }
  private audit(
    user: AuthenticatedUser,
    accion: string,
    id: string,
    before: Record<string, unknown> | null,
    after: Record<string, unknown> | null,
    targetEmpresaId?: string,
  ) {
    return this.auditRepo.save(
      this.auditRepo.create({
        empresaId: targetEmpresaId ?? user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'marcas_empresa',
        entidadId: id,
        valoresAnteriores: before ?? undefined,
        valoresNuevos: after ?? undefined,
        resultado: 'exito',
      }),
    );
  }
}
