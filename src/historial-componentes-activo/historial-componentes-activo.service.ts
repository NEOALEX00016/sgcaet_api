import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { HistorialComponentesActivo } from './entities/historial-componentes-activo.entity';

@Injectable()
export class HistorialComponentesActivoService {
  constructor(
    @InjectRepository(HistorialComponentesActivo)
    private readonly repository: Repository<HistorialComponentesActivo>,
  ) {}

  findAll(user: AuthenticatedUser, activoId?: string) {
    return this.repository.find({
      where: { empresaId: user.empresaId, ...(activoId ? { activoId } : {}) },
      order: { cambiadoEn: 'DESC', createdAt: 'DESC' },
    });
  }
}
