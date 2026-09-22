import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateDireccionesEmpresaDto } from './dto/create-direcciones-empresa.dto';
import { UpdateDireccionesEmpresaDto } from './dto/update-direcciones-empresa.dto';
import { DireccionesEmpresa } from './entities/direcciones-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class DireccionesEmpresaService {
  constructor(
    @InjectRepository(DireccionesEmpresa)
    private readonly repo: Repository<DireccionesEmpresa>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly auditRepo: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    d: CreateDireccionesEmpresaDto,
    u: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    if (
      await this.repo.findOne({
        where: {
          empresaId: scopeEmpresaId,
          tipoDireccion: d.tipoDireccion,
          linea1: d.linea1,
          ciudad: d.ciudad,
        },
      })
    )
      throw new BadRequestException('La direccion ya existe para la empresa');
    return this.save(d, u, 'DIRECCIONES_EMPRESA_CREAR', scopeEmpresaId);
  }
  findAll(u: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    return this.repo.find({
      where: { empresaId: scopeEmpresaId },
      order: { createdAt: 'DESC' },
    });
  }
  async findOne(id: string, u: AuthenticatedUser, targetEmpresaId?: string) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    const x = await this.repo.findOne({
      where: { id, empresaId: scopeEmpresaId },
    });
    if (!x) throw new NotFoundException('Direccion no encontrada');
    return x;
  }
  async update(
    id: string,
    d: UpdateDireccionesEmpresaDto,
    u: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    const x = await this.findOne(id, u, scopeEmpresaId);
    const b = { ...x };
    const s = await this.repo.save(this.repo.merge(x, d));
    await this.audit(
      u,
      'DIRECCIONES_EMPRESA_ACTUALIZAR',
      id,
      b,
      d,
      scopeEmpresaId,
    );
    return s;
  }
  private async save(
    d: CreateDireccionesEmpresaDto,
    u: AuthenticatedUser,
    a: string,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    const s = await this.repo.save(
      this.repo.create({ ...d, empresaId: scopeEmpresaId }),
    );
    await this.audit(u, a, s.id, null, d, scopeEmpresaId);
    return s;
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
        entidad: 'direcciones_empresa',
        entidadId: id,
        valoresAnteriores: b ?? undefined,
        valoresNuevos: n ?? undefined,
        resultado: 'exito',
      }),
    );
  }
}
