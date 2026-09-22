import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePrestamoActivoDto } from './dto/create-prestamo-activo.dto';
import { UpdatePrestamoActivoDto } from './dto/update-prestamo-activo.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PrestamoActivo } from './entities/prestamos-activo.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class PrestamosActivoService {
  constructor(
    @InjectRepository(PrestamoActivo)
    private readonly prestamosRepository: Repository<PrestamoActivo>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreatePrestamoActivoDto,
    user: AuthenticatedUser,
  ): Promise<PrestamoActivo> {
    await this.validarActor(user);
    await this.validarActivo(createDto.activoId, user.empresaId);
    this.validarReceptor(createDto.personaId, createDto.departamentoId);
    this.validarFechas(createDto.fechaSalida, createDto.fechaPrevistaRetorno);

    const prestamoActivoVigente = await this.prestamosRepository.findOne({
      where: {
        empresaId: user.empresaId,
        activoId: createDto.activoId,
        estado: 'prestado',
      },
    });

    if (prestamoActivoVigente) {
      throw new BadRequestException(
        'El activo ya tiene un prestamo vigente',
      );
    }

    const prestamo = this.prestamosRepository.create({
      ...createDto,
      empresaId: user.empresaId,
      fechaSalida: new Date(createDto.fechaSalida),
      fechaPrevistaRetorno: createDto.fechaPrevistaRetorno
        ? new Date(createDto.fechaPrevistaRetorno)
        : undefined,
      estado: createDto.estado ?? 'prestado',
    });
    const saved = await this.prestamosRepository.save(prestamo);

    await this.registrarBitacora(
      user,
      'PRESTAMOS_ACTIVO_CREAR',
      'prestamos_activo',
      saved.id,
      null,
      {
        activoId: saved.activoId,
        estado: saved.estado,
        fechaSalida: saved.fechaSalida.toISOString(),
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<PrestamoActivo[]> {
    return this.prestamosRepository.find({
      where: { empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<PrestamoActivo> {
    const prestamo = await this.prestamosRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!prestamo) {
      throw new NotFoundException(`Prestamo ${id} no encontrado`);
    }

    return prestamo;
  }

  async update(
    id: string,
    updateDto: UpdatePrestamoActivoDto,
    user: AuthenticatedUser,
  ): Promise<PrestamoActivo> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const fechaRetornoReal = updateDto.fechaRetornoReal
      ? new Date(updateDto.fechaRetornoReal)
      : actual.fechaRetornoReal;
    if (
      fechaRetornoReal &&
      fechaRetornoReal.getTime() < actual.fechaSalida.getTime()
    ) {
      throw new BadRequestException(
        'La fecha de retorno real no puede ser anterior a la fecha de salida',
      );
    }

    const payload = updateDto;
    const merged = this.prestamosRepository.merge(actual, {
      ...payload,
      fechaPrevistaRetorno: payload.fechaPrevistaRetorno
        ? new Date(payload.fechaPrevistaRetorno)
        : actual.fechaPrevistaRetorno,
      fechaRetornoReal,
    });

    if (merged.fechaRetornoReal && merged.estado === 'prestado') {
      merged.estado = 'devuelto';
    }

    const saved = await this.prestamosRepository.save(merged);

    await this.registrarBitacora(
      user,
      'PRESTAMOS_ACTIVO_ACTUALIZAR',
      'prestamos_activo',
      saved.id,
      {
        estado: actual.estado,
        fechaRetornoReal: actual.fechaRetornoReal?.toISOString() ?? null,
      },
      {
        estado: saved.estado,
        fechaRetornoReal: saved.fechaRetornoReal?.toISOString() ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estado = 'cancelado';
    await this.prestamosRepository.save(actual);

    await this.registrarBitacora(
      user,
      'PRESTAMOS_ACTIVO_CANCELAR',
      'prestamos_activo',
      actual.id,
      {
        estado: 'prestado',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private validarReceptor(personaId?: string, departamentoId?: string): void {
    if (!personaId && !departamentoId) {
      throw new BadRequestException(
        'El prestamo requiere persona o departamento destino',
      );
    }
  }

  private validarFechas(
    fechaSalida: string,
    fechaPrevistaRetorno?: string,
  ): void {
    if (!fechaPrevistaRetorno) {
      return;
    }

    if (
      new Date(fechaPrevistaRetorno).getTime() <=
      new Date(fechaSalida).getTime()
    ) {
      throw new BadRequestException(
        'La fecha prevista de retorno debe ser mayor que la fecha de salida',
      );
    }
  }

  private async validarActivo(
    activoId: string,
    empresaId: string,
  ): Promise<void> {
    const activo = await this.activosRepository.findOne({
      where: {
        id: activoId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!activo) {
      throw new NotFoundException(
        'Activo no encontrado para la empresa indicada',
      );
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
    user: AuthenticatedUser,
    accion: string,
    entidad: string,
    entidadId: string,
    valoresAnteriores: Record<string, unknown> | null,
    valoresNuevos: Record<string, unknown> | null,
  ): Promise<void> {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
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
