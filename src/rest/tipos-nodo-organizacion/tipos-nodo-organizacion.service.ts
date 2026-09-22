import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateTiposNodoOrganizacionDto } from './dto/create-tipos-nodo-organizacion.dto';
import { UpdateTiposNodoOrganizacionDto } from './dto/update-tipos-nodo-organizacion.dto';
import { TiposNodoOrganizacion } from './entities/tipos-nodo-organizacion.entity';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import type { AuthenticatedUser } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class TiposNodoOrganizacionService {
  constructor(
    @InjectRepository(TiposNodoOrganizacion)
    private readonly tiposRepository: Repository<TiposNodoOrganizacion>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    dto: CreateTiposNodoOrganizacionDto,
    user: AuthenticatedUser,
  ): Promise<TiposNodoOrganizacion> {
    await this.validarActor(user);

    const dtoNormalizado = this.normalizarCreate(dto);
    await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo);

    const item = await this.tiposRepository.save(
      this.tiposRepository.create({
        ...dtoNormalizado,
        empresaId: user.empresaId,
        esSistema: false,
        estaActivo: dtoNormalizado.estaActivo ?? true,
      }),
    );

    await this.registrarBitacora(user, 'TIPOS_NODO_ORGANIZACION_CREAR', item.id);
    return item;
  }

  async findAll(user: AuthenticatedUser): Promise<TiposNodoOrganizacion[]> {
    return this.tiposRepository.find({
      where: [{ empresaId: user.empresaId }, { empresaId: IsNull() }],
      order: {
        esSistema: 'DESC',
        nombreVisible: 'ASC',
      },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<TiposNodoOrganizacion> {
    const item = await this.tiposRepository.findOne({
      where: [{ id, empresaId: user.empresaId }, { id, empresaId: IsNull() }],
    });
    if (!item) {
      throw new NotFoundException('Tipo de nodo organizacional no encontrado');
    }
    return item;
  }

  async update(
    id: string,
    dto: UpdateTiposNodoOrganizacionDto,
    user: AuthenticatedUser,
  ): Promise<TiposNodoOrganizacion> {
    await this.validarActor(user);
    const item = await this.findOne(id, user);

    if (!item.empresaId || item.esSistema) {
      throw new ForbiddenException(
        'No se permite modificar tipos de nodo globales del sistema',
      );
    }

    const dtoNormalizado = this.normalizarUpdate(dto);

    if (dtoNormalizado.codigo && dtoNormalizado.codigo !== item.codigo) {
      await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo, item.id);
    }

    const saved = await this.tiposRepository.save(
      this.tiposRepository.merge(item, dtoNormalizado),
    );
    await this.registrarBitacora(
      user,
      'TIPOS_NODO_ORGANIZACION_ACTUALIZAR',
      saved.id,
    );
    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<{ ok: true }> {
    await this.validarActor(user);
    const item = await this.findOne(id, user);

    if (!item.empresaId || item.esSistema) {
      throw new ForbiddenException(
        'No se permite eliminar tipos de nodo globales del sistema',
      );
    }

    await this.tiposRepository.delete({ id, empresaId: user.empresaId });
    await this.registrarBitacora(user, 'TIPOS_NODO_ORGANIZACION_ELIMINAR', id);
    return { ok: true };
  }

  private async validarActor(user: AuthenticatedUser): Promise<void> {
    const actor = await this.usuariosRepository.findOne({
      where: {
        id: user.userId,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!actor) {
      throw new NotFoundException(
        'Usuario actor no encontrado para la empresa indicada',
      );
    }
  }

  private async validarCodigoUnico(
    empresaId: string,
    codigo: string,
    excluirId?: string,
  ): Promise<void> {
    const existente = await this.tiposRepository.findOne({
      where: { empresaId, codigo },
    });

    if (existente && existente.id !== excluirId) {
      throw new ConflictException(
        `Ya existe un tipo de nodo organizacional con codigo ${codigo}`,
      );
    }
  }

  private normalizarCreate(
    dto: CreateTiposNodoOrganizacionDto,
  ): CreateTiposNodoOrganizacionDto {
    return {
      ...dto,
      codigo: dto.codigo.trim().toLowerCase(),
      nombreVisible: dto.nombreVisible.trim(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private normalizarUpdate(
    dto: UpdateTiposNodoOrganizacionDto,
  ): UpdateTiposNodoOrganizacionDto {
    return {
      ...dto,
      codigo: dto.codigo?.trim().toLowerCase(),
      nombreVisible: dto.nombreVisible?.trim(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private async registrarBitacora(
    user: AuthenticatedUser,
    accion: string,
    entidadId: string,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad: 'catalogo_tipos_nodo_organizacion',
      entidadId,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }
}
