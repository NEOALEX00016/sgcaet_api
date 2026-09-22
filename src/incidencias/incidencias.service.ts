import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateIncidenciaDto } from './dto/create-incidencia.dto';
import { UpdateIncidenciaDto } from './dto/update-incidencia.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Incidencia } from './entities/incidencia.entity';
import { AuditoriaDetalle } from '../auditoria-detalles/entities/auditoria-detalle.entity';
import { Activo } from '../activos/entities/activo.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

@Injectable()
export class IncidenciasService {
  constructor(
    @InjectRepository(Incidencia)
    private readonly incidenciasRepository: Repository<Incidencia>,
    @InjectRepository(AuditoriaDetalle)
    private readonly auditoriaDetallesRepository: Repository<AuditoriaDetalle>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateIncidenciaDto,
    user: AuthenticatedUser,
  ): Promise<Incidencia> {
    await this.validarContexto(
      {
        auditoriaDetalleId: createDto.auditoriaDetalleId,
        activoId: createDto.activoId,
        lineaTelefonicaId: createDto.lineaTelefonicaId,
      },
      user.empresaId,
    );

    const existente = await this.incidenciasRepository.findOne({
      where: {
        empresaId: user.empresaId,
        codigo: createDto.codigo,
      },
    });
    if (existente) {
      throw new BadRequestException(
        'Ya existe una incidencia con el mismo codigo en la empresa',
      );
    }

    this.validarCierre(createDto.estado, createDto.cerradaEn);

    const payload = createDto;
    const incidencia = this.incidenciasRepository.create({
      ...payload,
      estado: payload.estado ?? 'abierta',
      prioridad: payload.prioridad ?? 'media',
      abiertaEn: payload.abiertaEn ? new Date(payload.abiertaEn) : new Date(),
      cerradaEn: payload.cerradaEn ? new Date(payload.cerradaEn) : undefined,
      empresaId: user.empresaId,
      reportadaPor: user.userId,
    });
    const saved = await this.incidenciasRepository.save(incidencia);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'INCIDENCIAS_CREAR',
      'incidencias',
      saved.id,
      null,
      {
        codigo: saved.codigo,
        estado: saved.estado,
        prioridad: saved.prioridad,
      },
    );

    return saved;
  }

  async findAll(
    empresaId: string,
    estado?: string,
    prioridad?: string,
    asignadaA?: string,
  ): Promise<Incidencia[]> {
    const where: Partial<Incidencia> = {};
    if (empresaId) {
      where.empresaId = empresaId;
    }
    if (estado) {
      where.estado = estado;
    }
    if (prioridad) {
      where.prioridad = prioridad;
    }
    if (asignadaA) {
      where.asignadaA = asignadaA;
    }

    return this.incidenciasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findMine(
    user: AuthenticatedUser,
    estado?: string,
    prioridad?: string,
  ): Promise<Incidencia[]> {
    const where: Partial<Incidencia> = {
      empresaId: user.empresaId,
      reportadaPor: user.userId,
    };
    if (estado) {
      where.estado = estado;
    }
    if (prioridad) {
      where.prioridad = prioridad;
    }

    return this.incidenciasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, empresaId: string): Promise<Incidencia> {
    const incidencia = await this.incidenciasRepository.findOne({
      where: { id, empresaId },
    });
    if (!incidencia) {
      throw new NotFoundException(`Incidencia ${id} no encontrada`);
    }

    return incidencia;
  }

  async update(
    id: string,
    updateDto: UpdateIncidenciaDto,
    user: AuthenticatedUser,
  ): Promise<Incidencia> {
    const actual = await this.findOne(id, user.empresaId);

    const payloadValidacion: CreateIncidenciaDto = {
      ...updateDto,
      codigo: actual.codigo,
      titulo: actual.titulo,
      auditoriaDetalleId:
        updateDto.auditoriaDetalleId ?? actual.auditoriaDetalleId,
      activoId: updateDto.activoId ?? actual.activoId,
      lineaTelefonicaId:
        updateDto.lineaTelefonicaId ?? actual.lineaTelefonicaId,
      estado: updateDto.estado ?? actual.estado,
      cerradaEn:
        updateDto.cerradaEn ??
        (actual.cerradaEn ? actual.cerradaEn.toISOString() : undefined),
    };
    await this.validarContexto(payloadValidacion, user.empresaId);
    this.validarCierre(payloadValidacion.estado, payloadValidacion.cerradaEn);

    if (updateDto.codigo && updateDto.codigo !== actual.codigo) {
      const duplicada = await this.incidenciasRepository.findOne({
        where: {
          empresaId: actual.empresaId,
          codigo: updateDto.codigo,
        },
      });
      if (duplicada && duplicada.id !== actual.id) {
        throw new BadRequestException(
          'Ya existe una incidencia con el mismo codigo en la empresa',
        );
      }
    }

    const payload = updateDto;
    const merged = this.incidenciasRepository.merge(actual, {
      ...payload,
      abiertaEn: payload.abiertaEn
        ? new Date(payload.abiertaEn)
        : actual.abiertaEn,
      cerradaEn: payload.cerradaEn
        ? new Date(payload.cerradaEn)
        : actual.cerradaEn,
    });
    const saved = await this.incidenciasRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'INCIDENCIAS_ACTUALIZAR',
      'incidencias',
      saved.id,
      {
        estado: actual.estado,
        prioridad: actual.prioridad,
        asignadaA: actual.asignadaA ?? null,
      },
      {
        estado: saved.estado,
        prioridad: saved.prioridad,
        asignadaA: saved.asignadaA ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user.empresaId);

    actual.estado = 'cancelada';
    actual.cerradaEn = new Date();
    await this.incidenciasRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'INCIDENCIAS_CANCELAR',
      'incidencias',
      actual.id,
      {
        estado: 'abierta',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private async validarContexto(
    dto: Pick<
      CreateIncidenciaDto,
      'auditoriaDetalleId' | 'activoId' | 'lineaTelefonicaId'
    >,
    empresaId: string,
  ): Promise<void> {
    if (dto.auditoriaDetalleId) {
      const detalle = await this.auditoriaDetallesRepository.findOne({
        where: {
          id: dto.auditoriaDetalleId,
          empresaId,
        },
      });
      if (!detalle) {
        throw new NotFoundException(
          'Auditoria detalle no encontrada para la empresa indicada',
        );
      }
    }

    if (dto.activoId) {
      const activo = await this.activosRepository.findOne({
        where: {
          id: dto.activoId,
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

    if (dto.lineaTelefonicaId) {
      const linea = await this.lineasRepository.findOne({
        where: {
          id: dto.lineaTelefonicaId,
          empresaId,
        },
      });
      if (!linea) {
        throw new NotFoundException(
          'Linea telefonica no encontrada para la empresa indicada',
        );
      }
    }
  }

  private validarCierre(estado?: string, cerradaEn?: string): void {
    const estadoNormalizado = estado ?? 'abierta';
    if (
      (estadoNormalizado === 'cerrada' || estadoNormalizado === 'cancelada') &&
      !cerradaEn
    ) {
      throw new BadRequestException(
        'Una incidencia cerrada o cancelada requiere fecha de cierre',
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
