import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDominiosEmpresaDto } from './dto/create-dominios-empresa.dto';
import { UpdateDominiosEmpresaDto } from './dto/update-dominios-empresa.dto';
import { DominiosEmpresa } from './entities/dominios-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class DominiosEmpresaService {
  constructor(
    @InjectRepository(DominiosEmpresa)
    private readonly repo: Repository<DominiosEmpresa>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly auditRepo: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    dto: CreateDominiosEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const hostname = dto.hostname.toLowerCase();
    if (await this.repo.findOne({ where: { hostname } }))
      throw new BadRequestException('El hostname ya existe');
    if (
      dto.esPrincipal &&
      (await this.repo.findOne({
          where: { empresaId: scopeEmpresaId, esPrincipal: true },
        }))
    )
      throw new BadRequestException('La empresa ya tiene dominio principal');
    const saved = await this.repo.save(
      this.repo.create({ ...dto, hostname, empresaId: scopeEmpresaId }),
    );
    await this.audit(
      user,
      'DOMINIOS_EMPRESA_CREAR',
      saved.id,
      null,
      dto,
      scopeEmpresaId,
    );
    return saved;
  }
  findAll(user: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    return this.repo.find({
      where: { empresaId: scopeEmpresaId },
      order: { createdAt: 'DESC' },
    });
  }
  async findOne(id: string, user: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const item = await this.repo.findOne({
      where: { id, empresaId: scopeEmpresaId },
    });
    if (!item) throw new NotFoundException('Dominio no encontrado');
    return item;
  }
  async update(
    id: string,
    dto: UpdateDominiosEmpresaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const item = await this.findOne(id, user, scopeEmpresaId);
    if (
      dto.hostname &&
      dto.hostname.toLowerCase() !== item.hostname &&
      (await this.repo.findOne({
        where: { hostname: dto.hostname.toLowerCase() },
      }))
    )
      throw new BadRequestException('El hostname ya existe');
    const before = { ...item };
    const saved = await this.repo.save(
      this.repo.merge(item, { ...dto, hostname: dto.hostname?.toLowerCase() }),
    );
    await this.audit(
      user,
      'DOMINIOS_EMPRESA_ACTUALIZAR',
      id,
      before,
      dto,
      scopeEmpresaId,
    );
    return saved;
  }
  private audit(
    u: AuthenticatedUser,
    a: string,
    id: string,
    b: Record<string, unknown> | null,
    n: Record<string, unknown> | null,
    targetEmpresaId?: string,
  ) {
    return this.auditRepo.save(
      this.auditRepo.create({
        empresaId: targetEmpresaId ?? u.empresaId,
        usuarioActorId: u.userId,
        accion: a,
        entidad: 'dominios_empresa',
        entidadId: id,
        valoresAnteriores: b ?? undefined,
        valoresNuevos: n ?? undefined,
        resultado: 'exito',
      }),
    );
  }
}
