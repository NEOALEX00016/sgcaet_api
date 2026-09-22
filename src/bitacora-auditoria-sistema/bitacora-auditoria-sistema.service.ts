import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BitacoraAuditoriaSistema } from './entities/bitacora-auditoria-sistema.entity';
import { QueryBitacoraAuditoriaSistemaDto } from './dto/query-bitacora-auditoria-sistema.dto';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class BitacoraAuditoriaSistemaService {
  constructor(
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async findAll(
    query: QueryBitacoraAuditoriaSistemaDto,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ) {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const pagina = query.pagina ?? 1;
    const limite = query.limite ?? 20;

    const qb = this.bitacoraRepository.createQueryBuilder('bitacora');

    qb.andWhere('bitacora.empresa_id = :empresaId', {
      empresaId: scopeEmpresaId,
    });

    if (query.usuarioActorId) {
      qb.andWhere('bitacora.usuario_actor_id = :usuarioActorId', {
        usuarioActorId: query.usuarioActorId,
      });
    }

    if (query.entidad) {
      qb.andWhere('bitacora.entidad = :entidad', { entidad: query.entidad });
    }

    if (query.accion) {
      qb.andWhere('bitacora.accion = :accion', { accion: query.accion });
    }

    if (query.dominio) {
      const entityPatterns = query.dominio === 'telecom'
        ? ['lineas_telefonicas', 'suscripciones_linea', 'movimientos_telecom', 'bolsas_telecom', 'contratos_telecom']
        : query.dominio === 'equipos'
          ? ['activos', 'asignaciones', 'asignacion_recursos', 'prestamos_activo', 'reparaciones_activo', 'devoluciones']
          : ['personas', 'departamentos', 'ubicaciones', 'solicitudes_portal'];
      qb.andWhere('bitacora.entidad IN (:...dominioEntidades)', { dominioEntidades: entityPatterns });
    }

    if (query.resultado) {
      qb.andWhere('bitacora.resultado = :resultado', {
        resultado: query.resultado,
      });
    }

    if (query.desde) {
      qb.andWhere('bitacora.created_at >= :desde', {
        desde: new Date(query.desde),
      });
    }

    if (query.hasta) {
      qb.andWhere('bitacora.created_at <= :hasta', {
        hasta: new Date(query.hasta),
      });
    }

    qb.orderBy('bitacora.created_at', 'DESC');
    qb.skip((pagina - 1) * limite).take(limite);

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      total,
      pagina,
      limite,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    };
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
    targetEmpresaId?: string,
  ): Promise<BitacoraAuditoriaSistema> {
    const scopeEmpresaId = targetEmpresaId ?? user.empresaId;
    const registro = await this.bitacoraRepository.findOne({
      where: { id, empresaId: scopeEmpresaId },
    });

    if (!registro) {
      throw new NotFoundException(`Registro de bitacora ${id} no encontrado`);
    }

    return registro;
  }
}
