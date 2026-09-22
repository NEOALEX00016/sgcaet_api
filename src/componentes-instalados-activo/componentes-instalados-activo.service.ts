import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ComponenteInstaladoActivo } from './entities/componente-instalado-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ComponentesInstaladosActivoService {
  constructor(
    @InjectRepository(ComponenteInstaladoActivo) private readonly componentes: Repository<ComponenteInstaladoActivo>,
    @InjectRepository(Activo) private readonly activos: Repository<Activo>,
  ) {}

  async findByActivo(activoId: string, includeHistory: boolean, user: AuthenticatedUser) {
    if (!activoId) throw new BadRequestException('activoId es obligatorio');
    const activo = await this.activos.findOne({ where: { id: activoId, empresaId: user.empresaId } });
    if (!activo) throw new NotFoundException('Activo no encontrado');
    return this.componentes.find({
      where: {
        empresaId: user.empresaId,
        activoId,
        ...(includeHistory ? {} : { estado: 'instalado' as const }),
      },
      order: { instaladoEn: 'DESC' },
    });
  }
}
