import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAsignacionBolsaTelecomDto } from './dto/create-asignacion-bolsa-telecom.dto';
import { UpdateAsignacionBolsaTelecomDto } from './dto/update-asignacion-bolsa-telecom.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AsignacionBolsaTelecom } from './entities/asignaciones-bolsa-telecom.entity';
import { BolsaTelecom } from '../bolsas-telecom/entities/bolsas-telecom.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SuscripcionesLinea } from '../suscripciones-linea/entities/suscripciones-linea.entity';

export type AsignacionesBolsaFilters = {
  lineaTelefonicaId?: string;
  estado?: 'activa' | 'consumida' | 'cancelada' | 'vencida';
  vigencia?: 'vigente' | 'vencida' | 'inconsistente';
};

@Injectable()
export class AsignacionesBolsaTelecomService {
  constructor(
    @InjectRepository(AsignacionBolsaTelecom)
    private readonly asignacionesBolsaRepository: Repository<AsignacionBolsaTelecom>,
    @InjectRepository(BolsaTelecom)
    private readonly bolsasRepository: Repository<BolsaTelecom>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(SuscripcionesLinea)
    private readonly suscripcionesRepository: Repository<SuscripcionesLinea>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
  ) {}

  async create(
    createDto: CreateAsignacionBolsaTelecomDto,
    user: AuthenticatedUser,
  ): Promise<AsignacionBolsaTelecom> {
    await this.validarActor(user);
    await this.validarBolsa(createDto.bolsaTelecomId, user.empresaId);
    this.validarDestino(
      createDto.personaId,
      createDto.departamentoId,
      createDto.lineaTelefonicaId,
    );

    if (createDto.lineaTelefonicaId) {
      await this.validarLinea(createDto.lineaTelefonicaId, user.empresaId);
      await this.validarSuscripcionActivaVigente(
        createDto.lineaTelefonicaId,
        user.empresaId,
      );
    }

    await this.validarBolsaVigente(createDto.bolsaTelecomId, user.empresaId);

    const asignacion = this.asignacionesBolsaRepository.create({
      ...createDto,
      empresaId: user.empresaId,
      estado: createDto.estado ?? 'activa',
    });
    const saved = await this.asignacionesBolsaRepository.save(asignacion);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'ASIGNACIONES_BOLSA_TELECOM_CREAR',
      'asignaciones_bolsa_telecom',
      saved.id,
      null,
      {
        bolsaTelecomId: saved.bolsaTelecomId,
        cantidad: saved.cantidad,
        unidad: saved.unidad,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    filters?: AsignacionesBolsaFilters,
  ): Promise<AsignacionBolsaTelecom[]> {
    const hasFilters =
      !!filters?.lineaTelefonicaId || !!filters?.estado || !!filters?.vigencia;

    if (!hasFilters) {
      return this.asignacionesBolsaRepository.find({
        where: { empresaId: user.empresaId },
        order: { createdAt: 'DESC' },
      });
    }

    const query = this.asignacionesBolsaRepository
      .createQueryBuilder('asignacion')
      .where('asignacion.empresa_id = :empresaId', { empresaId: user.empresaId });

    if (filters?.lineaTelefonicaId) {
      query.andWhere('asignacion.linea_telefonica_id = :lineaTelefonicaId', {
        lineaTelefonicaId: filters.lineaTelefonicaId,
      });
    }

    if (filters?.estado) {
      query.andWhere('asignacion.estado = :estado', { estado: filters.estado });
    }

    if (filters?.vigencia === 'vigente') {
      query
        .innerJoin(
          BolsaTelecom,
          'bolsa_vigente',
          'bolsa_vigente.id = asignacion.bolsa_telecom_id AND bolsa_vigente.empresa_id = :empresaId',
        )
        .andWhere(
          "bolsa_vigente.estado = 'activa' AND bolsa_vigente.inicia_en <= NOW() AND (bolsa_vigente.vence_en IS NULL OR bolsa_vigente.vence_en > NOW())",
        );
    }

    if (filters?.vigencia === 'vencida') {
      query
        .innerJoin(
          BolsaTelecom,
          'bolsa_vencida',
          'bolsa_vencida.id = asignacion.bolsa_telecom_id AND bolsa_vencida.empresa_id = :empresaId',
        )
        .andWhere(
          "(bolsa_vencida.vence_en IS NOT NULL AND bolsa_vencida.vence_en <= NOW()) OR bolsa_vencida.estado = 'vencida'",
        );
    }

    if (filters?.vigencia === 'inconsistente') {
      query
        .innerJoin(
          BolsaTelecom,
          'bolsa_inconsistente',
          'bolsa_inconsistente.id = asignacion.bolsa_telecom_id AND bolsa_inconsistente.empresa_id = :empresaId',
        )
        .andWhere(
          "(bolsa_inconsistente.estado = 'activa' AND (bolsa_inconsistente.inicia_en > NOW() OR (bolsa_inconsistente.vence_en IS NOT NULL AND bolsa_inconsistente.vence_en <= NOW()))) OR (bolsa_inconsistente.estado = 'vencida' AND (bolsa_inconsistente.vence_en IS NULL OR bolsa_inconsistente.vence_en > NOW()))",
        );
    }

    return query.orderBy('asignacion.created_at', 'DESC').getMany();
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<AsignacionBolsaTelecom> {
    const asignacion = await this.asignacionesBolsaRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!asignacion) {
      throw new NotFoundException(
        `Asignacion de bolsa telecom ${id} no encontrada`,
      );
    }

    return asignacion;
  }

  async update(
    id: string,
    updateDto: UpdateAsignacionBolsaTelecomDto,
    user: AuthenticatedUser,
  ): Promise<AsignacionBolsaTelecom> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const merged = this.asignacionesBolsaRepository.merge(actual, updateDto);

    if (merged.lineaTelefonicaId) {
      await this.validarLinea(merged.lineaTelefonicaId, user.empresaId);
      await this.validarSuscripcionActivaVigente(
        merged.lineaTelefonicaId,
        user.empresaId,
      );
    }
    await this.validarBolsaVigente(merged.bolsaTelecomId, user.empresaId);

    const saved = await this.asignacionesBolsaRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'ASIGNACIONES_BOLSA_TELECOM_ACTUALIZAR',
      'asignaciones_bolsa_telecom',
      saved.id,
      {
        cantidad: actual.cantidad,
        estado: actual.estado,
      },
      {
        cantidad: saved.cantidad,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estado = 'cancelada';
    await this.asignacionesBolsaRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'ASIGNACIONES_BOLSA_TELECOM_CANCELAR',
      'asignaciones_bolsa_telecom',
      actual.id,
      {
        estado: 'activa',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private validarDestino(
    personaId?: string,
    departamentoId?: string,
    lineaTelefonicaId?: string,
  ): void {
    if (!personaId && !departamentoId && !lineaTelefonicaId) {
      throw new BadRequestException(
        'Debe indicar persona, departamento o lineaTelefonicaId',
      );
    }
  }

  private async validarBolsa(
    bolsaTelecomId: string,
    empresaId: string,
  ): Promise<void> {
    const bolsa = await this.bolsasRepository.findOne({
      where: {
        id: bolsaTelecomId,
        empresaId,
      },
    });

    if (!bolsa) {
      throw new NotFoundException(
        'Bolsa telecom no encontrada para la empresa indicada',
      );
    }
  }

  private async validarBolsaVigente(
    bolsaTelecomId: string,
    empresaId: string,
  ): Promise<void> {
    const bolsa = await this.bolsasRepository.findOne({
      where: {
        id: bolsaTelecomId,
        empresaId,
      },
    });

    if (!bolsa) {
      throw new NotFoundException(
        'Bolsa telecom no encontrada para la empresa indicada',
      );
    }

    const ahora = Date.now();
    const iniciaEn = new Date(bolsa.iniciaEn).getTime();
    const venceEn = bolsa.venceEn ? new Date(bolsa.venceEn).getTime() : null;
    const vigente =
      bolsa.estado === 'activa' &&
      iniciaEn <= ahora &&
      (venceEn === null || venceEn > ahora);

    if (!vigente) {
      throw new BadRequestException(
        'La bolsa indicada no se encuentra vigente para asignacion',
      );
    }
  }

  private async validarLinea(
    lineaTelefonicaId: string,
    empresaId: string,
  ): Promise<void> {
    const linea = await this.lineasRepository.findOne({
      where: { id: lineaTelefonicaId, empresaId },
    });

    if (!linea || !linea.estaActiva) {
      throw new NotFoundException(
        'Linea telefonica no encontrada para la empresa indicada',
      );
    }
  }

  private async validarSuscripcionActivaVigente(
    lineaTelefonicaId: string,
    empresaId: string,
  ): Promise<void> {
    const suscripcion = await this.suscripcionesRepository.findOne({
      where: {
        empresaId,
        lineaTelefonicaId,
        estado: 'activa',
      },
    });

    if (!suscripcion) {
      throw new BadRequestException(
        'La linea no tiene una suscripcion activa vigente',
      );
    }

    const ahora = Date.now();
    const iniciaEn = new Date(suscripcion.iniciaEn).getTime();
    const venceEn = suscripcion.venceEn
      ? new Date(suscripcion.venceEn).getTime()
      : null;

    if (iniciaEn > ahora || (venceEn !== null && venceEn <= ahora)) {
      throw new BadRequestException(
        'La linea no tiene una suscripcion activa vigente',
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
