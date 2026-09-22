import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateMovimientosTelecomDto } from './dto/create-movimientos-telecom.dto';
import { UpdateMovimientosTelecomDto } from './dto/update-movimientos-telecom.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { MovimientosTelecom } from './entities/movimientos-telecom.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

export type MovimientosTelecomFilters = {
  lineaTelefonicaId?: string;
  bolsaTelecomId?: string;
  tipoMovimiento?: string;
  claveIdempotencia?: string;
  referenciaExterna?: string;
  ocurridoDesde?: string;
  ocurridoHasta?: string;
};

@Injectable()
export class MovimientosTelecomService {
  constructor(
    @InjectRepository(MovimientosTelecom)
    private readonly movimientosRepository: Repository<MovimientosTelecom>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(BolsaTelecom)
    private readonly bolsasRepository: Repository<BolsaTelecom>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateMovimientosTelecomDto,
    user: AuthenticatedUser,
  ): Promise<MovimientosTelecom> {
    await this.validarActor(user);
    await this.validarContexto(
      user.empresaId,
      createDto.lineaTelefonicaId,
      createDto.bolsaTelecomId,
    );

    if (createDto.claveIdempotencia) {
      const existente = await this.movimientosRepository.findOne({
        where: {
          empresaId: user.empresaId,
          claveIdempotencia: createDto.claveIdempotencia,
        },
      });
      if (existente) {
        this.validarConflictoIdempotencia(existente, createDto);
        return existente;
      }
    }

    const payload = createDto;
    const movimiento = this.movimientosRepository.create({
      ...payload,
      empresaId: user.empresaId,
      costo: payload.costo,
      moneda: payload.moneda?.toUpperCase(),
      ocurridoEn: payload.ocurridoEn
        ? new Date(payload.ocurridoEn)
        : new Date(),
    });
    const saved = await this.movimientosRepository.save(movimiento);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'MOVIMIENTOS_TELECOM_CREAR',
      'movimientos_telecom',
      saved.id,
      null,
      {
        tipoMovimiento: saved.tipoMovimiento,
        cantidad: saved.cantidad,
        unidad: saved.unidad,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    filters: MovimientosTelecomFilters = {},
  ): Promise<MovimientosTelecom[]> {
    const query = this.movimientosRepository
      .createQueryBuilder('movimiento')
      .where('movimiento.empresa_id = :empresaId', {
        empresaId: user.empresaId,
      });

    if (filters.lineaTelefonicaId) {
      query.andWhere('movimiento.linea_telefonica_id = :lineaTelefonicaId', {
        lineaTelefonicaId: filters.lineaTelefonicaId,
      });
    }

    if (filters.bolsaTelecomId) {
      query.andWhere('movimiento.bolsa_telecom_id = :bolsaTelecomId', {
        bolsaTelecomId: filters.bolsaTelecomId,
      });
    }

    if (filters.tipoMovimiento) {
      query.andWhere('movimiento.tipo_movimiento = :tipoMovimiento', {
        tipoMovimiento: filters.tipoMovimiento,
      });
    }

    if (filters.claveIdempotencia) {
      query.andWhere('movimiento.clave_idempotencia = :claveIdempotencia', {
        claveIdempotencia: filters.claveIdempotencia,
      });
    }

    if (filters.referenciaExterna) {
      query.andWhere('movimiento.referencia_externa = :referenciaExterna', {
        referenciaExterna: filters.referenciaExterna,
      });
    }

    if (filters.ocurridoDesde) {
      query.andWhere('movimiento.ocurrido_en >= :ocurridoDesde', {
        ocurridoDesde: new Date(filters.ocurridoDesde),
      });
    }

    if (filters.ocurridoHasta) {
      query.andWhere('movimiento.ocurrido_en <= :ocurridoHasta', {
        ocurridoHasta: new Date(filters.ocurridoHasta),
      });
    }

    query.orderBy('movimiento.ocurrido_en', 'DESC');
    query.addOrderBy('movimiento.created_at', 'DESC');

    return query.getMany();
  }

  private validarConflictoIdempotencia(
    existente: MovimientosTelecom,
    incoming: CreateMovimientosTelecomDto,
  ): void {
    const sameLinea = (existente.lineaTelefonicaId ?? null) === (incoming.lineaTelefonicaId ?? null);
    const sameBolsa = (existente.bolsaTelecomId ?? null) === (incoming.bolsaTelecomId ?? null);
    const sameTipo = existente.tipoMovimiento === incoming.tipoMovimiento;
    const sameCantidad = String(existente.cantidad) === String(incoming.cantidad);
    const sameUnidad = existente.unidad === incoming.unidad;

    if (!sameLinea || !sameBolsa || !sameTipo || !sameCantidad || !sameUnidad) {
      throw new ConflictException(
        'La claveIdempotencia ya fue utilizada con un payload diferente',
      );
    }
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<MovimientosTelecom> {
    const movimiento = await this.movimientosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!movimiento) {
      throw new NotFoundException(`Movimiento telecom ${id} no encontrado`);
    }

    return movimiento;
  }

  async update(
    id: string,
    updateDto: UpdateMovimientosTelecomDto,
    user: AuthenticatedUser,
  ): Promise<MovimientosTelecom> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const lineaTelefonicaId =
      updateDto.lineaTelefonicaId ?? actual.lineaTelefonicaId;
    const bolsaTelecomId = updateDto.bolsaTelecomId ?? actual.bolsaTelecomId;
    await this.validarContexto(
      actual.empresaId,
      lineaTelefonicaId,
      bolsaTelecomId,
    );

    const payload = updateDto;
    const merged = this.movimientosRepository.merge(actual, {
      ...payload,
      moneda: payload.moneda ? payload.moneda.toUpperCase() : actual.moneda,
      ocurridoEn: payload.ocurridoEn
        ? new Date(payload.ocurridoEn)
        : actual.ocurridoEn,
    });
    const saved = await this.movimientosRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'MOVIMIENTOS_TELECOM_ACTUALIZAR',
      'movimientos_telecom',
      saved.id,
      {
        tipoMovimiento: actual.tipoMovimiento,
        cantidad: actual.cantidad,
      },
      {
        tipoMovimiento: saved.tipoMovimiento,
        cantidad: saved.cantidad,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    await this.movimientosRepository.delete({
      id: actual.id,
      empresaId: user.empresaId,
    });

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'MOVIMIENTOS_TELECOM_ELIMINAR',
      'movimientos_telecom',
      actual.id,
      {
        tipoMovimiento: actual.tipoMovimiento,
        cantidad: actual.cantidad,
      },
      null,
    );
  }

  private async validarContexto(
    empresaId: string,
    lineaTelefonicaId?: string,
    bolsaTelecomId?: string,
  ): Promise<void> {
    if (!lineaTelefonicaId && !bolsaTelecomId) {
      throw new BadRequestException(
        'El movimiento requiere lineaTelefonicaId o bolsaTelecomId',
      );
    }

    if (lineaTelefonicaId) {
      const linea = await this.lineasRepository.findOne({
        where: { id: lineaTelefonicaId, empresaId },
      });
      if (!linea) {
        throw new NotFoundException(
          'Linea telefonica no encontrada para la empresa indicada',
        );
      }
    }

    if (bolsaTelecomId) {
      const bolsa = await this.bolsasRepository.findOne({
        where: { id: bolsaTelecomId, empresaId },
      });
      if (!bolsa) {
        throw new NotFoundException(
          'Bolsa telecom no encontrada para la empresa indicada',
        );
      }
    }
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
    usuarioActorId: string,
    empresaId: string,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId,
      usuarioActorId,
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
