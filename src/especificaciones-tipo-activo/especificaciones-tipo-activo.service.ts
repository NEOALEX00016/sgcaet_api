import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EspecificacionTipoActivo } from './entities/especificacion-tipo-activo.entity';
import { CreateEspecificacionTipoActivoDto } from './dto/create-especificacion-tipo-activo.dto';
import { UpdateEspecificacionTipoActivoDto } from './dto/update-especificacion-tipo-activo.dto';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class EspecificacionesTipoActivoService {
  constructor(
    @InjectRepository(EspecificacionTipoActivo)
    private readonly repository: Repository<EspecificacionTipoActivo>,
    @InjectRepository(TiposActivo)
    private readonly tiposRepository: Repository<TiposActivo>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
  ) {}

  findAll(
    user: AuthenticatedUser,
    tipoActivoId?: string,
    categoriaEquipoId?: string,
  ) {
    return this.repository.find({
      where: {
        empresaId: user.empresaId,
        ...(tipoActivoId ? { tipoActivoId } : {}),
        ...(categoriaEquipoId ? { categoriaEquipoId } : {}),
      },
      order: { nombre: 'ASC' },
    });
  }

  async create(
    dto: CreateEspecificacionTipoActivoDto,
    user: AuthenticatedUser,
  ) {
    if (!dto.tipoActivoId && !dto.categoriaEquipoId) {
      throw new BadRequestException(
        'Debes enviar tipoActivoId o categoriaEquipoId.',
      );
    }
    if (dto.tipoActivoId && dto.categoriaEquipoId) {
      throw new BadRequestException(
        'Solo se permite tipoActivoId o categoriaEquipoId, no ambos.',
      );
    }

    const clave = this.toSlug(dto.nombre);
    this.validarTipoDato(dto.tipoDato);

    await this.validateScopeFk(dto, user);

    if (dto.tipoActivoId && dto.dependeDeClave) {
      await this.validateDependency(dto.tipoActivoId, dto.dependeDeClave, user);
    }

    await this.ensureUniqueClave(
      user,
      clave,
      dto.tipoActivoId,
      dto.categoriaEquipoId,
    );

    return this.repository.save(
      this.repository.create({
        ...dto,
        clave,
        empresaId: user.empresaId,
        tipoDato: (dto.tipoDato ??
          'texto') as EspecificacionTipoActivo['tipoDato'],
        esObligatoria: dto.esObligatoria ?? false,
      }),
    );
  }

  async update(
    id: string,
    dto: UpdateEspecificacionTipoActivoDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Especificacion no encontrada');
    this.validarTipoDato(dto.tipoDato);
    if (item.tipoActivoId && dto.dependeDeClave) {
      await this.validateDependency(
        item.tipoActivoId,
        dto.dependeDeClave,
        user,
      );
    }

    return this.repository.save(
      this.repository.merge(item, {
        ...dto,
        clave: item.clave,
        unidad: dto.unidad === '' ? undefined : dto.unidad,
        tipoDato: dto.tipoDato
          ? (dto.tipoDato as EspecificacionTipoActivo['tipoDato'])
          : item.tipoDato,
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Especificacion no encontrada');
    await this.repository.delete({ id, empresaId: user.empresaId });
    return { ok: true };
  }

  private async validateDependency(
    tipoActivoId: string,
    dependeDeClave: string,
    user: AuthenticatedUser,
  ) {
    const tipo = await this.tiposRepository.findOne({
      where: { id: tipoActivoId, empresaId: user.empresaId },
    });
    if (!tipo?.categoriaEquipoId) {
      throw new BadRequestException(
        'El tipo no tiene categoria para validar dependencia.',
      );
    }
    const general = await this.repository.findOne({
      where: {
        empresaId: user.empresaId,
        categoriaEquipoId: tipo.categoriaEquipoId,
        clave: dependeDeClave,
      },
    });
    if (!general) {
      throw new BadRequestException(
        `No existe especificacion general de categoria con clave ${dependeDeClave}.`,
      );
    }
  }

  private async validateScopeFk(
    dto: CreateEspecificacionTipoActivoDto,
    user: AuthenticatedUser,
  ) {
    if (dto.tipoActivoId) {
      const tipo = await this.tiposRepository.findOne({
        where: {
          id: dto.tipoActivoId,
          empresaId: user.empresaId,
          estaActivo: true,
        },
      });
      if (!tipo) {
        throw new NotFoundException(
          'Tipo de activo no encontrado para la empresa',
        );
      }
    }

    if (dto.categoriaEquipoId) {
      const categoria = await this.categoriasRepository.findOne({
        where: {
          id: dto.categoriaEquipoId,
          empresaId: user.empresaId,
          estaActiva: true,
        },
      });
      if (!categoria) {
        throw new NotFoundException(
          'Categoria de equipo no encontrada para la empresa',
        );
      }
    }
  }

  private validarTipoDato(tipoDato?: string) {
    if (!tipoDato) return;

    if (!['texto', 'numero', 'fecha', 'booleano'].includes(tipoDato)) {
      throw new BadRequestException('tipoDato invalido');
    }
  }

  private toSlug(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private async ensureUniqueClave(
    user: AuthenticatedUser,
    clave: string,
    tipoActivoId?: string,
    categoriaEquipoId?: string,
  ) {
    const existing = await this.repository.findOne({
      where: {
        empresaId: user.empresaId,
        clave,
        ...(tipoActivoId ? { tipoActivoId } : {}),
        ...(categoriaEquipoId ? { categoriaEquipoId } : {}),
      },
    });
    if (existing)
      throw new BadRequestException(
        `Ya existe una especificacion con la clave ${clave} en este alcance.`,
      );
  }
}
