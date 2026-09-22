import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAuditoriaDto } from './dto/create-auditoria.dto';
import { UpdateAuditoriaDto } from './dto/update-auditoria.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, QueryFailedError, Repository } from 'typeorm';
import { Auditoria } from './entities/auditoria.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class AuditoriasService {
  constructor(
    @InjectRepository(Auditoria)
    private readonly auditoriasRepository: Repository<Auditoria>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createAuditoriaDto: CreateAuditoriaDto,
    user: AuthenticatedUser,
  ): Promise<Auditoria> {
    this.validarFechas(
      createAuditoriaDto.fechaInicio,
      createAuditoriaDto.fechaCierre,
    );

    const payload = createAuditoriaDto;
    const auditoria = this.auditoriasRepository.create({
      ...payload,
      empresaId: user.empresaId,
      fechaInicio:
        payload.fechaInicio
          ? new Date(payload.fechaInicio)
          : payload.estado === 'en_ejecucion'
            ? new Date()
            : undefined,
      fechaCierre: payload.fechaCierre
        ? new Date(payload.fechaCierre)
        : undefined,
      fechaProgramada: payload.fechaProgramada
        ? payload.fechaProgramada.slice(0, 10)
        : undefined,
      estado: payload.estado ?? 'programada',
      dominio: payload.dominio ?? 'equipos',
      alcanceTipo: payload.alcanceTipo ?? 'general',
      alcanceId: payload.alcanceId,
      creadaPor: payload.creadaPor ?? user.userId,
    });
    let saved: Auditoria;
    try {
      saved = await this.auditoriasRepository.save(auditoria);
    } catch (error) {
      if (error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new BadRequestException('Ya existe una auditoría con ese código para este tenant. Usa otro código.');
      }
      throw error;
    }

    await this.registrarBitacora(
      user,
      'AUDITORIAS_CREAR',
      'auditorias',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        tipoAuditoria: saved.tipoAuditoria,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    estado?: string,
    dominio?: string,
  ): Promise<Auditoria[]> {
    const where: Partial<Auditoria> = { empresaId: user.empresaId };
    if (estado) {
      where.estado = estado;
    }
    if (dominio) {
      where.dominio = dominio as Auditoria['dominio'];
    }

    const items = await this.auditoriasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return Promise.all(items.map(async item => ({
      ...item,
      finalizadaPorUsuario: item.finalizadaPor
        ? await this.usuariosRepository.findOne({ where: { id: item.finalizadaPor, empresaId: user.empresaId } })
        : undefined,
    })));
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Auditoria> {
    const auditoria = await this.auditoriasRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!auditoria) {
      throw new NotFoundException(`Auditoria ${id} no encontrada`);
    }

    return auditoria;
  }

  async update(
    id: string,
    updateAuditoriaDto: UpdateAuditoriaDto,
    user: AuthenticatedUser,
  ): Promise<Auditoria> {
    const actual = await this.findOne(id, user);
    if (actual.estado === 'cerrada') throw new BadRequestException('La auditoría está cerrada y solo permite consulta.');

    const fechaInicio = updateAuditoriaDto.fechaInicio
      ? new Date(updateAuditoriaDto.fechaInicio)
      : actual.fechaInicio;
    const fechaCierre = updateAuditoriaDto.fechaCierre
      ? new Date(updateAuditoriaDto.fechaCierre)
      : actual.fechaCierre;
    this.validarFechas(fechaInicio?.toISOString(), fechaCierre?.toISOString());

    const payload = updateAuditoriaDto;
    const merged = this.auditoriasRepository.merge(actual, {
      ...payload,
      fechaInicio,
      fechaCierre: payload.estado === 'cerrada' ? (fechaCierre ?? new Date()) : fechaCierre,
      finalizadaPor: payload.estado === 'cerrada' ? user.userId : actual.finalizadaPor,
      fechaProgramada: payload.fechaProgramada
        ? payload.fechaProgramada.slice(0, 10)
        : actual.fechaProgramada,
    });
    const saved = await this.auditoriasRepository.save(merged);

    await this.registrarBitacora(
      user,
      'AUDITORIAS_ACTUALIZAR',
      'auditorias',
      saved.id,
      {
        estado: actual.estado,
        fechaCierre: actual.fechaCierre?.toISOString() ?? null,
      },
      {
        estado: saved.estado,
        fechaCierre: saved.fechaCierre?.toISOString() ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);

    actual.estado = 'cancelada';
    await this.auditoriasRepository.save(actual);

    await this.registrarBitacora(
      user,
      'AUDITORIAS_CANCELAR',
      'auditorias',
      actual.id,
      {
        estado: 'programada',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private validarFechas(fechaInicio?: string, fechaCierre?: string): void {
    if (!fechaInicio || !fechaCierre) {
      return;
    }

    if (new Date(fechaCierre).getTime() < new Date(fechaInicio).getTime()) {
      throw new BadRequestException(
        'La fecha de cierre no puede ser anterior a la fecha de inicio',
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
