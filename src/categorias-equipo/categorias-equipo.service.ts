import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CategoriaEquipo } from './entities/categoria-equipo.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateCategoriaEquipoDto } from './dto/create-categoria-equipo.dto';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { DominioCatalogoActivo } from '../dominios-catalogo-activos/entities/dominio-catalogo-activo.entity';
@Injectable()
export class CategoriasEquipoService {
  constructor(
    @InjectRepository(CategoriaEquipo)
    private readonly repository: Repository<CategoriaEquipo>,
    @InjectRepository(TiposActivo)
    private readonly tiposRepository: Repository<TiposActivo>,
    @InjectRepository(DominioCatalogoActivo)
    private readonly dominiosRepository: Repository<DominioCatalogoActivo>,
  ) {}
  findAll(user: AuthenticatedUser) {
    return this.repository.find({
      where: { empresaId: user.empresaId },
      order: { nombre: 'ASC' },
    });
  }
  async create(dto: CreateCategoriaEquipoDto, user: AuthenticatedUser) {
    const dtoNormalizado = this.normalizarDto(dto);
    await this.validarDominio(dtoNormalizado.dominioId, user.empresaId);
    await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo);

    return this.repository.save(
      this.repository.create({
        ...dtoNormalizado,
        empresaId: user.empresaId,
        dominioId: dtoNormalizado.dominioId,
        estaActiva: true,
      }),
    );
  }
  async update(
    id: string,
    dto: CreateCategoriaEquipoDto,
    user: AuthenticatedUser,
  ) {
    const dtoNormalizado = this.normalizarDto(dto);
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Categoria no encontrada');

    if (dtoNormalizado.dominioId !== item.dominioId) {
      await this.validarDominio(dtoNormalizado.dominioId, user.empresaId);
    }
    if (dtoNormalizado.codigo !== item.codigo) {
      await this.validarCodigoUnico(user.empresaId, dtoNormalizado.codigo, item.id);
    }

    return this.repository.save(this.repository.merge(item, dtoNormalizado));
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Categoria no encontrada');
    const children = await this.tiposRepository.count({
      where: { empresaId: user.empresaId, categoriaEquipoId: id },
    });
    if (children > 0)
      throw new BadRequestException(
        'No se puede eliminar una categoria con tipos asociados; deshabilitala.',
      );
    item.estaActiva = false;
    await this.repository.save(item);
    return { ok: true };
  }

  private normalizarDto(dto: CreateCategoriaEquipoDto): CreateCategoriaEquipoDto {
    return {
      ...dto,
      codigo: dto.codigo.trim().toLowerCase(),
      nombre: dto.nombre.trim(),
      iconName: dto.iconName?.trim(),
      descripcion: dto.descripcion?.trim(),
    };
  }

  private async validarDominio(dominioId: string, empresaId: string) {
    const dominio = await this.dominiosRepository.findOne({
      where: { id: dominioId, empresaId, estaActivo: true },
    });
    if (!dominio) {
      throw new NotFoundException('Dominio de catalogo no encontrado');
    }
  }

  private async validarCodigoUnico(
    empresaId: string,
    codigo: string,
    excluirId?: string,
  ) {
    const existente = await this.repository.findOne({
      where: { empresaId, codigo },
    });
    if (existente && existente.id !== excluirId) {
      throw new ConflictException(`Ya existe una categoria con codigo ${codigo}`);
    }
  }
}
