import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExistenciaRepuesto } from './entities/existencias-repuesto.entity';
import { PiezaRepuesto } from '../piezas-repuestos/entities/piezas-repuesto.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ExistenciasRepuestosService {
  constructor(@InjectRepository(ExistenciaRepuesto) private readonly existencias: Repository<ExistenciaRepuesto>, @InjectRepository(PiezaRepuesto) private readonly piezas: Repository<PiezaRepuesto>) {}
  findAll(user: AuthenticatedUser) { return this.existencias.find({ where: { empresaId: user.empresaId }, order: { updatedAt: 'DESC' } }); }
  async findOne(piezaRepuestoId: string, user: AuthenticatedUser) {
    if (!await this.piezas.findOne({ where: { id: piezaRepuestoId, empresaId: user.empresaId } })) throw new NotFoundException('Pieza de repuesto no encontrada');
    const item = await this.existencias.findOne({ where: { piezaRepuestoId, empresaId: user.empresaId } });
    return item ?? { empresaId: user.empresaId, piezaRepuestoId, cantidadDisponible: '0', cantidadReservada: '0' };
  }
}
