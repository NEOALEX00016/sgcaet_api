import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateSuscripcionesLineaDto } from './dto/create-suscripciones-linea.dto';
import { UpdateSuscripcionesLineaDto } from './dto/update-suscripciones-linea.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { SuscripcionesLinea } from './entities/suscripciones-linea.entity';
import { LineaTelefonica } from '../lineas-telefonicas/entities/lineas-telefonica.entity';
import { PlanesTelefonico } from '../planes-telefonicos/entities/planes-telefonico.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { PlanComercialTelecom } from '../planes-comerciales-telecom/entities/planes-comerciales-telecom.entity';

export type SuscripcionesLineaFilters = {
  lineaTelefonicaId?: string;
  estado?: 'activa' | 'vencida' | 'cancelada' | 'suspendida';
  vigencia?: 'vigente' | 'vencida' | 'inconsistente';
};

@Injectable()
export class SuscripcionesLineaService {
  constructor(
    @InjectRepository(SuscripcionesLinea)
    private readonly suscripcionesRepository: Repository<SuscripcionesLinea>,
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(PlanesTelefonico)
    private readonly planesRepository: Repository<PlanesTelefonico>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(PlanComercialTelecom)
    private readonly planesComercialesRepository: Repository<PlanComercialTelecom>,
  ) {}

  async create(
    createSuscripcionesLineaDto: CreateSuscripcionesLineaDto,
    user: AuthenticatedUser,
  ): Promise<SuscripcionesLinea> {
    await this.validarActor(user);
    await this.validarLinea(
      createSuscripcionesLineaDto.lineaTelefonicaId,
      user.empresaId,
    );
    if (!createSuscripcionesLineaDto.planTelefonicoId && !createSuscripcionesLineaDto.planComercialTelecomId) {
      throw new BadRequestException('La suscripción requiere plan legacy o plan comercial Telecom');
    }
    if (createSuscripcionesLineaDto.planTelefonicoId) await this.validarPlan(createSuscripcionesLineaDto.planTelefonicoId, user.empresaId);
    if (createSuscripcionesLineaDto.planComercialTelecomId) {
      await this.validarPlanComercial(createSuscripcionesLineaDto.planComercialTelecomId, createSuscripcionesLineaDto.lineaTelefonicaId, user.empresaId);
    }
    this.validarFechas(
      createSuscripcionesLineaDto.iniciaEn,
      createSuscripcionesLineaDto.venceEn,
    );

    const suscripcionActiva = await this.suscripcionesRepository.findOne({
      where: {
        empresaId: user.empresaId,
        lineaTelefonicaId: createSuscripcionesLineaDto.lineaTelefonicaId,
        estado: 'activa',
      },
    });
    if (suscripcionActiva) {
      throw new BadRequestException('La linea ya tiene una suscripcion activa');
    }

    this.validarCoherenciaEstadoVigencia(
      createSuscripcionesLineaDto.estado ?? 'activa',
      createSuscripcionesLineaDto.iniciaEn,
      createSuscripcionesLineaDto.venceEn,
    );

    const payload = createSuscripcionesLineaDto;
    const suscripcion = this.suscripcionesRepository.create({
      ...payload,
      empresaId: user.empresaId,
      iniciaEn: new Date(payload.iniciaEn),
      venceEn: payload.venceEn ? new Date(payload.venceEn) : undefined,
      estado: payload.estado ?? 'activa',
    });
    const saved = await this.suscripcionesRepository.save(suscripcion);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'SUSCRIPCIONES_LINEA_CREAR',
      'suscripciones_linea',
      saved.id,
      null,
      {
        lineaTelefonicaId: saved.lineaTelefonicaId,
        planTelefonicoId: saved.planTelefonicoId,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    filters?: SuscripcionesLineaFilters,
  ): Promise<SuscripcionesLinea[]> {
    const hasFilters =
      !!filters?.lineaTelefonicaId || !!filters?.estado || !!filters?.vigencia;

    if (!hasFilters) {
      return this.suscripcionesRepository.find({
        where: { empresaId: user.empresaId },
        order: { createdAt: 'DESC' },
      });
    }

    const query = this.suscripcionesRepository
      .createQueryBuilder('suscripcion')
      .where('suscripcion.empresa_id = :empresaId', { empresaId: user.empresaId });

    if (filters?.lineaTelefonicaId) {
      query.andWhere('suscripcion.linea_telefonica_id = :lineaTelefonicaId', {
        lineaTelefonicaId: filters.lineaTelefonicaId,
      });
    }

    if (filters?.estado) {
      query.andWhere('suscripcion.estado = :estado', { estado: filters.estado });
    }

    if (filters?.vigencia === 'vigente') {
      query.andWhere(
        "suscripcion.estado = 'activa' AND suscripcion.inicia_en <= NOW() AND (suscripcion.vence_en IS NULL OR suscripcion.vence_en > NOW())",
      );
    }

    if (filters?.vigencia === 'vencida') {
      query.andWhere(
        "(suscripcion.vence_en IS NOT NULL AND suscripcion.vence_en <= NOW()) OR suscripcion.estado = 'vencida'",
      );
    }

    if (filters?.vigencia === 'inconsistente') {
      query.andWhere(
        "(suscripcion.estado = 'activa' AND (suscripcion.inicia_en > NOW() OR (suscripcion.vence_en IS NOT NULL AND suscripcion.vence_en <= NOW()))) OR (suscripcion.estado = 'vencida' AND (suscripcion.vence_en IS NULL OR suscripcion.vence_en > NOW()))",
      );
    }

    return query.orderBy('suscripcion.created_at', 'DESC').getMany();
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<SuscripcionesLinea> {
    const suscripcion = await this.suscripcionesRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!suscripcion) {
      throw new NotFoundException(`Suscripcion de linea ${id} no encontrada`);
    }

    return suscripcion;
  }

  async update(
    id: string,
    updateSuscripcionesLineaDto: UpdateSuscripcionesLineaDto,
    user: AuthenticatedUser,
  ): Promise<SuscripcionesLinea> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const lineaTelefonicaId =
      updateSuscripcionesLineaDto.lineaTelefonicaId ?? actual.lineaTelefonicaId;
    const planTelefonicoId =
      updateSuscripcionesLineaDto.planTelefonicoId ?? actual.planTelefonicoId;
    await this.validarLinea(lineaTelefonicaId, actual.empresaId);
    if (planTelefonicoId) await this.validarPlan(planTelefonicoId, actual.empresaId);

    const iniciaEn =
      updateSuscripcionesLineaDto.iniciaEn ?? actual.iniciaEn.toISOString();
    const venceEn =
      updateSuscripcionesLineaDto.venceEn ?? actual.venceEn?.toISOString();
    this.validarFechas(iniciaEn, venceEn);

    const estadoObjetivo = updateSuscripcionesLineaDto.estado ?? actual.estado;
    const lineaObjetivo =
      updateSuscripcionesLineaDto.lineaTelefonicaId ?? actual.lineaTelefonicaId;
    if (estadoObjetivo === 'activa') {
      const suscripcionActiva = await this.suscripcionesRepository.findOne({
        where: {
          empresaId: user.empresaId,
          lineaTelefonicaId: lineaObjetivo,
          estado: 'activa',
        },
      });

      if (suscripcionActiva && suscripcionActiva.id !== id) {
        throw new BadRequestException(
          'La linea ya tiene una suscripcion activa',
        );
      }
    }

    this.validarCoherenciaEstadoVigencia(
      estadoObjetivo,
      iniciaEn,
      venceEn,
    );

    const payload = updateSuscripcionesLineaDto;
    const merged = this.suscripcionesRepository.merge(actual, {
      ...payload,
      iniciaEn: payload.iniciaEn ? new Date(payload.iniciaEn) : actual.iniciaEn,
      venceEn: payload.venceEn ? new Date(payload.venceEn) : actual.venceEn,
    });
    const saved = await this.suscripcionesRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'SUSCRIPCIONES_LINEA_ACTUALIZAR',
      'suscripciones_linea',
      saved.id,
      {
        estado: actual.estado,
        venceEn: actual.venceEn?.toISOString() ?? null,
      },
      {
        estado: saved.estado,
        venceEn: saved.venceEn?.toISOString() ?? null,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estado = 'cancelada';
    await this.suscripcionesRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'SUSCRIPCIONES_LINEA_CANCELAR',
      'suscripciones_linea',
      actual.id,
      {
        estado: 'activa',
      },
      {
        estado: actual.estado,
      },
    );
  }

  private validarFechas(iniciaEn: string, venceEn?: string): void {
    if (!venceEn) {
      return;
    }

    if (new Date(venceEn).getTime() <= new Date(iniciaEn).getTime()) {
      throw new BadRequestException(
        'La fecha de vencimiento debe ser mayor que la fecha de inicio',
      );
    }
  }

  private validarCoherenciaEstadoVigencia(
    estado: string,
    iniciaEn: string,
    venceEn?: string,
  ): void {
    const ahora = Date.now();
    const iniciaEnTs = new Date(iniciaEn).getTime();
    const venceEnTs = venceEn ? new Date(venceEn).getTime() : null;

    if (
      estado === 'activa' &&
      (iniciaEnTs > ahora || (venceEnTs !== null && venceEnTs <= ahora))
    ) {
      throw new BadRequestException(
        'Una suscripcion activa debe estar vigente segun su rango de fechas',
      );
    }

    if (estado === 'vencida' && (venceEnTs === null || venceEnTs > ahora)) {
      throw new BadRequestException(
        'Una suscripcion vencida debe tener fecha de vencimiento pasada',
      );
    }
  }

  private async validarLinea(
    lineaTelefonicaId: string,
    empresaId: string,
  ): Promise<void> {
    const linea = await this.lineasRepository.findOne({
      where: {
        id: lineaTelefonicaId,
        empresaId,
      },
    });

    if (!linea || !linea.estaActiva) {
      throw new NotFoundException(
        'Linea telefonica no encontrada para la empresa indicada',
      );
    }
  }

  private async validarPlan(
    planTelefonicoId: string,
    empresaId: string,
  ): Promise<void> {
    const plan = await this.planesRepository.findOne({
      where: {
        id: planTelefonicoId,
        empresaId,
      },
    });

    if (!plan || !plan.estaActivo) {
      throw new NotFoundException(
        'Plan telefonico no encontrado para la empresa indicada',
      );
    }
  }

  private async validarPlanComercial(planId: string, lineaId: string, empresaId: string): Promise<void> {
    const plan = await this.planesComercialesRepository.findOne({ where: { id: planId, empresaId, estaActivo: true } });
    if (!plan) throw new NotFoundException('Plan comercial Telecom no encontrado para la empresa indicada');
    const linea = await this.lineasRepository.findOne({ where: { id: lineaId, empresaId } });
    if (!linea || linea.operadoraId !== plan.operadoraId) throw new BadRequestException('El plan comercial no coincide con la operadora de la línea');
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
