import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Empresa } from '../empresas/entities/empresa.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

@Injectable()
export class TargetTenantContextService {
  constructor(
    @InjectRepository(Empresa)
    private readonly empresasRepository: Repository<Empresa>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async resolveTargetEmpresaId(
    actor: AuthenticatedUser,
    requestedEmpresaId?: string,
    action = 'PLATAFORMA_TENANT_OBJETIVO_SELECCIONAR',
  ): Promise<string> {
    const actorRow = await this.usuariosRepository.findOne({
      where: { id: actor.userId, empresaId: actor.empresaId, deletedAt: IsNull() },
    });
    if (!actorRow?.esPropietarioPlataforma) {
      throw new ForbiddenException(
        'Solo un PlatformOwner puede operar con tenant objetivo',
      );
    }

    const targetEmpresaId = requestedEmpresaId?.trim() || actor.empresaId;
    if (!targetEmpresaId) {
      throw new BadRequestException('Tenant objetivo requerido');
    }

    const exists = await this.empresasRepository.findOne({
      where: { id: targetEmpresaId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!exists) {
      throw new BadRequestException('Tenant objetivo invalido o no existe');
    }

    await this.bitacoraRepository.save(
      this.bitacoraRepository.create({
        empresaId: targetEmpresaId,
        usuarioActorId: actor.userId,
        accion: action,
        entidad: 'empresas',
        entidadId: targetEmpresaId,
        valoresNuevos: { targetEmpresaId },
        resultado: 'exito',
      }),
    );

    return targetEmpresaId;
  }
}
