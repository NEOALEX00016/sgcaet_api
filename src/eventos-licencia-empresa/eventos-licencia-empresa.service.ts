import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateEventosLicenciaEmpresaDto } from './dto/create-eventos-licencia-empresa.dto';
import { EventosLicenciaEmpresa } from './entities/eventos-licencia-empresa.entity';
import { LicenciaEmpresa } from '../licencias-empresa/entities/licencias-empresa.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class EventosLicenciaEmpresaService {
  constructor(
    @InjectRepository(EventosLicenciaEmpresa)
    private readonly repo: Repository<EventosLicenciaEmpresa>,
    @InjectRepository(LicenciaEmpresa)
    private readonly licRepo: Repository<LicenciaEmpresa>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly auditRepo: Repository<BitacoraAuditoriaSistema>,
  ) {}
  async create(
    d: CreateEventosLicenciaEmpresaDto,
    u: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? u.empresaId;
    const l = await this.licRepo.findOne({
      where: { id: d.licenciaEmpresaId, empresaId: scopeEmpresaId },
    });
    if (!l)
      throw new NotFoundException('Licencia no encontrada para el tenant');
    const s = await this.repo.save(
      this.repo.create({
        ...d,
        empresaId: scopeEmpresaId,
        realizadoPor: u.userId,
      }),
    );
    await this.auditRepo.save(
      this.auditRepo.create({
        empresaId: scopeEmpresaId,
        usuarioActorId: u.userId,
        accion: 'EVENTOS_LICENCIA_EMPRESA_CREAR',
        entidad: 'eventos_licencia_empresa',
        entidadId: s.id,
        valoresNuevos: d,
        resultado: 'exito',
      }),
    );
    return s;
  }

  findAll(empresaId: string, licenciaEmpresaId?: string) {
    return this.repo.find({
      where: {
        empresaId,
        ...(licenciaEmpresaId ? { licenciaEmpresaId } : {}),
      },
      order: { realizadoEn: 'DESC' },
    });
  }
}
