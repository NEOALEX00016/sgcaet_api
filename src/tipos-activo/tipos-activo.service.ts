import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateTiposActivoDto } from './dto/create-tipos-activo.dto';
import { UpdateTiposActivoDto } from './dto/update-tipos-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { TiposActivo } from './entities/tipos-activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Activo } from '../activos/entities/activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

@Injectable()
export class TiposActivoService {
  constructor(
    @InjectRepository(TiposActivo)
    private readonly tiposRepository: Repository<TiposActivo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
  ) {}

  async create(
    createTiposActivoDto: CreateTiposActivoDto,
    user: AuthenticatedUser,
  ): Promise<TiposActivo> {
    await this.validarActor(user);
    await this.validarCategoria(
      createTiposActivoDto.categoriaEquipoId,
      user.empresaId,
    );

    const dtoNormalizado = this.normalizarCreate(createTiposActivoDto);

    const tipo = this.tiposRepository.create({
      ...dtoNormalizado,
      empresaId: user.empresaId,
      estaActivo: dtoNormalizado.estaActivo ?? true,
    });
    const saved = await this.tiposRepository.save(tipo);

    await this.registrarBitacora(
      user,
      'TIPOS_ACTIVO_CREAR',
      'tipos_activo',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        nombre: saved.nombre,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<TiposActivo[]> {
    return this.tiposRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<TiposActivo> {
    const tipo = await this.tiposRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!tipo) {
      throw new NotFoundException(`Tipo de activo ${id} no encontrado`);
    }

    return tipo;
  }

  async update(
    id: string,
    updateTiposActivoDto: UpdateTiposActivoDto,
    user: AuthenticatedUser,
  ): Promise<TiposActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);
    const dtoNormalizado = this.normalizarUpdate(updateTiposActivoDto);

    if (dtoNormalizado.categoriaEquipoId !== undefined) {
      await this.validarCategoria(dtoNormalizado.categoriaEquipoId, user.empresaId);
    }

    const merged = this.tiposRepository.merge(actual, dtoNormalizado);
    const saved = await this.tiposRepository.save(merged);

    await this.registrarBitacora(
      user,
      'TIPOS_ACTIVO_ACTUALIZAR',
      'tipos_activo',
      saved.id,
      {
        nombre: actual.nombre,
        descripcion: actual.descripcion ?? null,
        estaActivo: actual.estaActivo,
      },
      {
        nombre: saved.nombre,
        descripcion: saved.descripcion ?? null,
        estaActivo: saved.estaActivo,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const used = await this.activosRepository.count({
      where: { empresaId: user.empresaId, tipoActivoId: id },
    });
    if (used > 0)
      throw new BadRequestException(
        'No se puede eliminar un tipo usado por activos; deshabilitalo.',
      );
    actual.estaActivo = false;
    await this.tiposRepository.save(actual);

    await this.registrarBitacora(
      user,
      'TIPOS_ACTIVO_DESACTIVAR',
      'tipos_activo',
      actual.id,
      {
        estaActivo: true,
      },
      {
        estaActivo: actual.estaActivo,
      },
    );
  }

  private async validarCategoria(
    categoriaEquipoId: string | undefined,
    empresaId: string,
  ): Promise<void> {
    if (!categoriaEquipoId) return;

    const categoria = await this.categoriasRepository.findOne({
      where: { id: categoriaEquipoId, empresaId, estaActiva: true },
    });
    if (!categoria) {
      throw new NotFoundException(
        'Categoria de equipo no encontrada para la empresa indicada',
      );
    }
  }

  private normalizarCreate(dto: CreateTiposActivoDto): CreateTiposActivoDto {
    return {
      ...dto,
      codigo: dto.codigo.trim().toLowerCase(),
      nombre: dto.nombre.trim(),
      iconName: dto.iconName?.trim(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private normalizarUpdate(dto: UpdateTiposActivoDto): UpdateTiposActivoDto {
    return {
      ...dto,
      codigo: dto.codigo?.trim().toLowerCase(),
      nombre: dto.nombre?.trim(),
      iconName: dto.iconName?.trim(),
      descripcion: dto.descripcion?.trim(),
    };
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

  private async registrarBitacora(
    user: AuthenticatedUser,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await this.bitacoraRepository.save(registro);
  }
}
