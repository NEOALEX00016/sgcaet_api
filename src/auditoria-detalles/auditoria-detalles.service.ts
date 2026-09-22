import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAuditoriaDetalleDto } from './dto/create-auditoria-detalle.dto';
import { UpdateAuditoriaDetalleDto } from './dto/update-auditoria-detalle.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AuditoriaDetalle } from './entities/auditoria-detalle.entity';
import { Auditoria } from '../auditorias/entities/auditoria.entity';
import { Activo } from '../activos/entities/activo.entity';
import { Persona } from '../personas/entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { TiposActivo } from '../tipos-activo/entities/tipos-activo.entity';
import { CategoriaEquipo } from '../categorias-equipo/entities/categoria-equipo.entity';

@Injectable()
export class AuditoriaDetallesService {
  constructor(
    @InjectRepository(AuditoriaDetalle)
    private readonly detallesRepository: Repository<AuditoriaDetalle>,
    @InjectRepository(Auditoria)
    private readonly auditoriasRepository: Repository<Auditoria>,
    @InjectRepository(Activo)
    private readonly activosRepository: Repository<Activo>,
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(TiposActivo)
    private readonly tiposActivosRepository: Repository<TiposActivo>,
    @InjectRepository(CategoriaEquipo)
    private readonly categoriasRepository: Repository<CategoriaEquipo>,
  ) {}

  async create(
    createDto: CreateAuditoriaDetalleDto,
    user: AuthenticatedUser,
  ): Promise<AuditoriaDetalle> {
    const auditoria = await this.validarAuditoria(createDto.auditoriaId, user.empresaId);
    if (auditoria.estado === 'cerrada') throw new BadRequestException('La auditoría está cerrada y solo permite consulta.');
    await this.validarActivo(createDto.activoId, user.empresaId);
    await this.validarPersona(createDto.personaReportadaId, user.empresaId);

    const existente = await this.detallesRepository.findOne({
      where: {
        auditoriaId: createDto.auditoriaId,
        activoId: createDto.activoId,
      },
    });
    if (existente) {
      throw new BadRequestException(
        'El activo ya tiene un detalle registrado en esta auditoria',
      );
    }

    const payload = createDto;
    const detalle = this.detallesRepository.create({
      ...payload,
      empresaId: user.empresaId,
      dominio: payload.dominio ?? 'equipos',
      confirmadoEn: payload.confirmadoEn
        ? new Date(payload.confirmadoEn)
        : new Date(),
    });
    const saved = await this.detallesRepository.save(detalle);

    await this.registrarBitacora(
      user,
      'AUDITORIA_DETALLES_CREAR',
      'auditoria_detalles',
      saved.id,
      null,
      {
        auditoriaId: saved.auditoriaId,
        activoId: saved.activoId,
        resultado: saved.resultado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    auditoriaId?: string,
  ): Promise<AuditoriaDetalle[]> {
    const where: Partial<AuditoriaDetalle> = { empresaId: user.empresaId };
    if (auditoriaId) {
      where.auditoriaId = auditoriaId;
    }

    return this.detallesRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AuditoriaDetalle> {
    const detalle = await this.detallesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!detalle) {
      throw new NotFoundException(`Auditoria detalle ${id} no encontrado`);
    }

    return detalle;
  }

  async update(
    id: string,
    updateDto: UpdateAuditoriaDetalleDto,
    user: AuthenticatedUser,
  ): Promise<AuditoriaDetalle> {
    const actual = await this.findOne(id, user);
    const auditoriaActual = await this.validarAuditoria(actual.auditoriaId, user.empresaId);
    if (auditoriaActual.estado === 'cerrada') throw new BadRequestException('La auditoría está cerrada y solo permite consulta.');

    const auditoriaId = updateDto.auditoriaId ?? actual.auditoriaId;
    const activoId = updateDto.activoId ?? actual.activoId;
    await this.validarAuditoria(auditoriaId, actual.empresaId);
    await this.validarActivo(activoId, actual.empresaId);
    await this.validarPersona(updateDto.personaReportadaId, actual.empresaId);

    const payload = updateDto;
    const merged = this.detallesRepository.merge(actual, {
      ...payload,
      confirmadoEn: payload.confirmadoEn
        ? new Date(payload.confirmadoEn)
        : actual.confirmadoEn,
    });
    const saved = await this.detallesRepository.save(merged);

    await this.registrarBitacora(
      user,
      'AUDITORIA_DETALLES_ACTUALIZAR',
      'auditoria_detalles',
      saved.id,
      {
        resultado: actual.resultado,
      },
      {
        resultado: saved.resultado,
      },
    );

    return saved;
  }


  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);

    await this.detallesRepository.delete({
      id: actual.id,
      empresaId: user.empresaId,
    });

    await this.registrarBitacora(
      user,
      'AUDITORIA_DETALLES_ELIMINAR',
      'auditoria_detalles',
      actual.id,
      {
        auditoriaId: actual.auditoriaId,
        activoId: actual.activoId,
      },
      null,
    );
  }

  private async validarAuditoria(
    auditoriaId: string,
    empresaId: string,
  ): Promise<Auditoria> {
    const auditoria = await this.auditoriasRepository.findOne({
      where: {
        id: auditoriaId,
        empresaId,
      },
    });

    if (!auditoria) {
      throw new NotFoundException(
        'Auditoria no encontrada para la empresa indicada',
      );
    }
    return auditoria;
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

  private async validarPersona(
    personaReportadaId: string | undefined,
    empresaId: string,
  ): Promise<void> {
    if (!personaReportadaId) {
      return;
    }

    const persona = await this.personasRepository.findOne({
      where: {
        id: personaReportadaId,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!persona) {
      throw new NotFoundException(
        'Persona reportada no encontrada para la empresa indicada',
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
