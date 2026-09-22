import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTiposAsignacionDto } from './dto/create-tipos-asignacion.dto';
import { UpdateTiposAsignacionDto } from './dto/update-tipos-asignacion.dto';
import { TipoAsignacion } from './entities/tipos-asignacion.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class TiposAsignacionService {
  constructor(
    @InjectRepository(TipoAsignacion)
    private readonly repository: Repository<TipoAsignacion>,
  ) {}

  async create(
    createTiposAsignacionDto: CreateTiposAsignacionDto,
    user: AuthenticatedUser,
  ) {
    const codigo = createTiposAsignacionDto.codigo.trim().toLowerCase();
    const existing = await this.repository.findOne({
      where: { empresaId: user.empresaId, codigo },
    });
    if (existing) {
      throw new BadRequestException(
        `Ya existe un tipo de asignacion con codigo ${codigo}`,
      );
    }

    return this.repository.save(
      this.repository.create({
        ...createTiposAsignacionDto,
        empresaId: user.empresaId,
        codigo,
        requiereFormulario: createTiposAsignacionDto.requiereFormulario ?? true,
        estaActivo: createTiposAsignacionDto.estaActivo ?? true,
      }),
    );
  }

  findAll(user: AuthenticatedUser) {
    return this.repository.find({
      where: { empresaId: user.empresaId },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser) {
    const item = await this.repository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) {
      throw new NotFoundException('Tipo de asignacion no encontrado');
    }
    return item;
  }

  async update(
    id: string,
    updateTiposAsignacionDto: UpdateTiposAsignacionDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.findOne(id, user);
    if (
      updateTiposAsignacionDto.codigo &&
      updateTiposAsignacionDto.codigo.trim().toLowerCase() !== item.codigo
    ) {
      const nextCode = updateTiposAsignacionDto.codigo.trim().toLowerCase();
      const existing = await this.repository.findOne({
        where: { empresaId: user.empresaId, codigo: nextCode },
      });
      if (existing) {
        throw new BadRequestException(
          `Ya existe un tipo de asignacion con codigo ${nextCode}`,
        );
      }
      item.codigo = nextCode;
    }

    return this.repository.save(
      this.repository.merge(item, {
        ...updateTiposAsignacionDto,
        codigo: item.codigo,
      }),
    );
  }

  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.findOne(id, user);
    item.estaActivo = false;
    return this.repository.save(item);
  }
}
