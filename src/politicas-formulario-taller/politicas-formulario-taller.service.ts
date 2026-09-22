import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { CreatePoliticasFormularioTallerDto } from './dto/create-politicas-formulario-taller.dto';
import { UpdatePoliticasFormularioTallerDto } from './dto/update-politicas-formulario-taller.dto';
import { PoliticaFormularioTaller } from './entities/politicas-formulario-taller.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { Formulario } from '../formularios/entities/formulario.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PoliticasFormularioTallerService {
  constructor(
    @InjectRepository(PoliticaFormularioTaller)
    private readonly repository: Repository<PoliticaFormularioTaller>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
    @InjectRepository(TiposActivo)
    private readonly tiposRepository: Repository<TiposActivo>,
    @InjectRepository(Formulario)
    private readonly formulariosRepository: Repository<Formulario>,
  ) {}

  async create(
    dto: CreatePoliticasFormularioTallerDto,
    user: AuthenticatedUser,
  ) {
    await this.validate(dto, user);
    await this.assertUnique(dto, user);
    return this.repository.save(
      this.repository.create({
        ...dto,
        empresaId: user.empresaId,
        esObligatoria: dto.esObligatoria ?? false,
        estaActiva: dto.estaActiva ?? true,
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
    if (!item)
      throw new NotFoundException(
        'Politica de formulario de taller no encontrada',
      );
    return item;
  }

  async update(
    id: string,
    dto: UpdatePoliticasFormularioTallerDto,
    user: AuthenticatedUser,
  ) {
    const merged = this.repository.merge(await this.findOne(id, user), dto);
    await this.validate(merged, user);
    await this.assertUnique(merged, user, id);
    return this.repository.save(merged);
  }

  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    item.estaActiva = false;
    return this.repository.save(item);
  }

  async resolve(
    empresaId: string,
    tipoServicio: string,
    etapa: string,
    tipoActivoId: string,
    categoriaEquipoId?: string,
  ) {
    const candidates = await this.repository.find({
      where: { empresaId, tipoServicio, etapa, estaActiva: true },
    });
    return (
      candidates.find((item) => item.tipoActivoId === tipoActivoId) ??
      candidates.find(
        (item) =>
          !item.tipoActivoId && item.categoriaEquipoId === categoriaEquipoId,
      ) ??
      candidates.find((item) => !item.tipoActivoId && !item.categoriaEquipoId)
    );
  }

  private async validate(
    payload: Pick<
      CreatePoliticasFormularioTallerDto,
      'categoriaEquipoId' | 'tipoActivoId' | 'formularioId'
    >,
    user: AuthenticatedUser,
  ) {
    if (payload.categoriaEquipoId && payload.tipoActivoId)
      throw new BadRequestException(
        'Solo puede indicar categoriaEquipoId o tipoActivoId',
      );
    if (
      payload.categoriaEquipoId &&
      !(await this.categoriasRepository.findOne({
        where: {
          id: payload.categoriaEquipoId,
          empresaId: user.empresaId,
          estaActiva: true,
        },
      }))
    )
      throw new BadRequestException(
        'categoriaEquipoId no existe o no esta activa',
      );
    if (
      payload.tipoActivoId &&
      !(await this.tiposRepository.findOne({
        where: {
          id: payload.tipoActivoId,
          empresaId: user.empresaId,
          estaActivo: true,
        },
      }))
    )
      throw new BadRequestException('tipoActivoId no existe o no esta activo');
    if (
      !(await this.formulariosRepository.findOne({
        where: {
          id: payload.formularioId,
          empresaId: user.empresaId,
          estaActivo: true,
        },
      }))
    )
      throw new BadRequestException('formularioId no existe o no esta activo');
  }

  private async assertUnique(
    payload: Pick<
      CreatePoliticasFormularioTallerDto,
      'tipoServicio' | 'etapa' | 'categoriaEquipoId' | 'tipoActivoId'
    >,
    user: AuthenticatedUser,
    excludeId?: string,
  ) {
    const duplicate = await this.repository.findOne({
      where: {
        empresaId: user.empresaId,
        tipoServicio: payload.tipoServicio,
        etapa: payload.etapa,
        categoriaEquipoId: (payload.categoriaEquipoId ?? null) as never,
        tipoActivoId: (payload.tipoActivoId ?? null) as never,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
    });
    if (duplicate)
      throw new BadRequestException(
        'Ya existe una politica para el mismo servicio, etapa y alcance',
      );
  }
}
