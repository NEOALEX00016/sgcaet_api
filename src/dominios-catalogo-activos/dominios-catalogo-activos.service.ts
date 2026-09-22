import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DominioCatalogoActivo } from './entities/dominio-catalogo-activo.entity';
import { CreateDominioCatalogoActivoDto } from './dto/create-dominio-catalogo-activo.dto';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
@Injectable()
export class DominiosCatalogoActivosService {
  constructor(
    @InjectRepository(DominioCatalogoActivo)
    private readonly repository: Repository<DominioCatalogoActivo>,
  ) {}
  findAll(user: AuthenticatedUser) {
    return this.repository.find({
      where: { empresaId: user.empresaId },
      order: { nombre: 'ASC' },
    });
  }
  create(dto: CreateDominioCatalogoActivoDto, user: AuthenticatedUser) {
    return this.repository.save(
      this.repository.create({
        ...dto,
        empresaId: user.empresaId,
        esBase: false,
        estaActivo: true,
      }),
    );
  }
  async update(
    id: string,
    dto: CreateDominioCatalogoActivoDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Dominio no encontrado');
    if (item.esBase && dto.codigo && dto.codigo !== item.codigo)
      throw new BadRequestException(
        'No se puede cambiar el codigo de un dominio base',
      );
    return this.repository.save(
      this.repository.merge(item, {
        ...dto,
        codigo: item.esBase ? item.codigo : dto.codigo,
      }),
    );
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Dominio no encontrado');
    if (item.esBase)
      throw new BadRequestException(
        'Los dominios Equipos y Telecom no se pueden eliminar',
      );
    item.estaActivo = false;
    return this.repository.save(item);
  }
  async assertTelecomCapability(
    empresaId: string,
    capability: 'manejaLineas' | 'manejaMinutos' | 'manejaDatos' | 'manejaSms',
  ) {
    const domain = await this.repository.findOne({
      where: { empresaId, codigo: 'telecom', estaActivo: true },
    });
    if (!domain || !domain[capability])
      throw new BadRequestException(
        `El dominio telecom no tiene habilitada la capacidad ${capability}`,
      );
  }
}
