import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePoliticasFormularioAsignacionDto } from './dto/create-politicas-formulario-asignacion.dto';
import { UpdatePoliticasFormularioAsignacionDto } from './dto/update-politicas-formulario-asignacion.dto';
import { PoliticaFormularioAsignacion } from './entities/politicas-formulario-asignacion.entity';
import { TipoAsignacion } from '../tipos-asignacion/entities/tipos-asignacion.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PoliticasFormularioAsignacionService {
  constructor(
    @InjectRepository(PoliticaFormularioAsignacion)
    private readonly repository: Repository<PoliticaFormularioAsignacion>,
    @InjectRepository(TipoAsignacion)
    private readonly tiposAsignacionRepository: Repository<TipoAsignacion>,
    @InjectRepository(DominioCatalogoActivo)
    private readonly dominiosRepository: Repository<DominioCatalogoActivo>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
    @InjectRepository(Formulario)
    private readonly formulariosRepository: Repository<Formulario>,
  ) {}

  async create(
    createPoliticasFormularioAsignacionDto: CreatePoliticasFormularioAsignacionDto,
    user: AuthenticatedUser,
  ) {
    await this.validateReferences(createPoliticasFormularioAsignacionDto, user);
    await this.assertUniqueScope(createPoliticasFormularioAsignacionDto, user);

    return this.repository.save(
      this.repository.create({
        ...createPoliticasFormularioAsignacionDto,
        empresaId: user.empresaId,
        estaActiva: createPoliticasFormularioAsignacionDto.estaActiva ?? true,
      }),
    );
  }

  findAll(user: AuthenticatedUser) {
    return this.repository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) {
      throw new NotFoundException('Politica de formulario no encontrada');
    }
    return item;
  }

  async update(
    id: string,
    updatePoliticasFormularioAsignacionDto: UpdatePoliticasFormularioAsignacionDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user);
    const merged = this.repository.merge(item, updatePoliticasFormularioAsignacionDto);

    await this.validateReferences(merged, user);
    await this.assertUniqueScope(merged, user, id);

    return this.repository.save(merged);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    item.estaActiva = false;
    return this.repository.save(item);
  }

  private async validateReferences(
    payload: Pick<
      CreatePoliticasFormularioAsignacionDto,
      'tipoAsignacionId' | 'dominioId' | 'categoriaId' | 'formularioId'
    >,
    user: AuthenticatedUser,
  ) {
    const tipo = await this.tiposAsignacionRepository.findOne({
      where: {
        id: payload.tipoAsignacionId,
        empresaId: user.empresaId,
        estaActivo: true,
      },
    });
    if (!tipo) {
      throw new BadRequestException('tipoAsignacionId no existe o no está activo');
    }

    if (payload.dominioId) {
      const dominio = await this.dominiosRepository.findOne({
        where: {
          id: payload.dominioId,
          empresaId: user.empresaId,
          estaActivo: true,
        },
      });
      if (!dominio) {
        throw new BadRequestException('dominioId no existe o no está activo');
      }
    }

    if (payload.categoriaId) {
      const categoria = await this.categoriasRepository.findOne({
        where: {
          id: payload.categoriaId,
          empresaId: user.empresaId,
          estaActiva: true,
        },
      });
      if (!categoria) {
        throw new BadRequestException('categoriaId no existe o no está activa');
      }
      if (payload.dominioId && categoria.dominioId !== payload.dominioId) {
        throw new BadRequestException('La categoria no pertenece al dominio seleccionado');
      }
    }

    const formulario = await this.formulariosRepository.findOne({
      where: {
        id: payload.formularioId,
        empresaId: user.empresaId,
        estaActivo: true,
      },
    });
    if (!formulario) {
      throw new BadRequestException('formularioId no existe o no está activo');
    }
  }

  private async assertUniqueScope(
    payload: Pick<
      CreatePoliticasFormularioAsignacionDto,
      'tipoAsignacionId' | 'dominioId' | 'categoriaId'
    >,
    user: AuthenticatedUser,
    excludeId?: string,
  ) {
    const items = await this.repository.find({
      where: { empresaId: user.empresaId, tipoAsignacionId: payload.tipoAsignacionId },
    });

    const duplicated = items.find((item) => {
      if (excludeId && item.id === excludeId) return false;
      return (
        (item.dominioId ?? null) === (payload.dominioId ?? null) &&
        (item.categoriaId ?? null) === (payload.categoriaId ?? null)
      );
    });

    if (duplicated) {
      throw new BadRequestException(
        'Ya existe una politica para el mismo tipo y alcance (dominio/categoria).',
      );
    }
  }
}
