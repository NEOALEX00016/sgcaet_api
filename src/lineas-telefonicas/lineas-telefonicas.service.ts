import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLineaTelefonicaDto } from './dto/create-linea-telefonica.dto';
import { UpdateLineaTelefonicaDto } from './dto/update-linea-telefonica.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { LineaTelefonica } from './entities/lineas-telefonica.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { Persona } from '../personas/entities/persona.entity';

export type LineasTelefonicasFilters = {
  estado?: string;
  estaActiva?: boolean;
  search?: string;
};

export type PersonaLineaTraceFilters = {
  personaId?: string;
  lineaTelefonicaId?: string;
  soloActivas?: boolean;
};

export type PersonaLineaTraceItem = {
  asignacionRecursoId: string;
  asignacionId: string;
  lineaTelefonicaId: string;
  numeroLinea: string;
  personaId?: string;
  personaNombre?: string;
  estadoAsignacion: string;
  recursoActivo: boolean;
  asignadoEn: Date;
};

@Injectable()
export class LineasTelefonicasService {
  constructor(
    @InjectRepository(LineaTelefonica)
    private readonly lineasRepository: Repository<LineaTelefonica>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
  ) {}

  async create(
    createLineaTelefonicaDto: CreateLineaTelefonicaDto,
    user: AuthenticatedUser,
  ): Promise<LineaTelefonica> {
    await this.validarActor(user);
    await this.validarNumeroUnico(user.empresaId, createLineaTelefonicaDto.numero);

    const linea = this.lineasRepository.create({
      ...createLineaTelefonicaDto,
      empresaId: user.empresaId,
      tipoLinea: createLineaTelefonicaDto.tipoLinea ?? 'voz_datos',
      estado: createLineaTelefonicaDto.estado ?? 'registrada',
      estaActiva: createLineaTelefonicaDto.estaActiva ?? true,
    });

    const saved = await this.lineasRepository.save(linea);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'LINEAS_TELEFONICAS_CREAR',
      'lineas_telefonicas',
      saved.id,
      null,
      {
        numero: saved.numero,
        tipoLinea: saved.tipoLinea,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    filters?: LineasTelefonicasFilters,
  ): Promise<LineaTelefonica[]> {
    const hasFilters =
      !!filters?.estado ||
      typeof filters?.estaActiva === 'boolean' ||
      !!filters?.search?.trim();

    if (!hasFilters) {
      return this.lineasRepository.find({
        where: { empresaId: user.empresaId },
        order: { createdAt: 'DESC' },
      });
    }

    const query = this.lineasRepository
      .createQueryBuilder('linea')
      .where('linea.empresa_id = :empresaId', { empresaId: user.empresaId });

    if (filters?.estado) {
      query.andWhere('linea.estado = :estado', { estado: filters.estado });
    }

    if (typeof filters?.estaActiva === 'boolean') {
      query.andWhere('linea.esta_activa = :estaActiva', {
        estaActiva: filters.estaActiva,
      });
    }

    if (filters?.search?.trim()) {
      query.andWhere('(linea.numero ILIKE :search OR linea.iccid ILIKE :search)', {
        search: `%${filters.search.trim()}%`,
      });
    }

    return query.orderBy('linea.created_at', 'DESC').getMany();
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<LineaTelefonica> {
    const linea = await this.lineasRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!linea) {
      throw new NotFoundException(`Linea telefonica ${id} no encontrada`);
    }

    return linea;
  }

  async update(
    id: string,
    updateLineaTelefonicaDto: UpdateLineaTelefonicaDto,
    user: AuthenticatedUser,
  ): Promise<LineaTelefonica> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    if (
      updateLineaTelefonicaDto.numero &&
      updateLineaTelefonicaDto.numero !== actual.numero
    ) {
      await this.validarNumeroUnico(
        user.empresaId,
        updateLineaTelefonicaDto.numero,
        id,
      );
    }

    const merged = this.lineasRepository.merge(
      actual,
      updateLineaTelefonicaDto,
    );
    const saved = await this.lineasRepository.save(merged);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'LINEAS_TELEFONICAS_ACTUALIZAR',
      'lineas_telefonicas',
      saved.id,
      {
        numero: actual.numero,
        estado: actual.estado,
        tipoLinea: actual.tipoLinea,
      },
      {
        numero: saved.numero,
        estado: saved.estado,
        tipoLinea: saved.tipoLinea,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.estaActiva = false;
    actual.estado = 'cancelada';
    await this.lineasRepository.save(actual);

    await this.registrarBitacora(
      user.userId,
      user.empresaId,
      'LINEAS_TELEFONICAS_CANCELAR',
      'lineas_telefonicas',
      actual.id,
      {
        estado: 'activa',
        estaActiva: true,
      },
      {
        estado: actual.estado,
        estaActiva: actual.estaActiva,
      },
    );
  }

  async cambiarLineaAsignada(
    user: AuthenticatedUser,
    asignacionId: string,
    lineaAnteriorId: string,
    lineaNuevaId: string,
  ): Promise<{ ok: true }> {
    const empresaId = user.empresaId;
    await this.validarActor(user);
    await this.validarAsignacion(asignacionId, empresaId);

    if (lineaAnteriorId === lineaNuevaId) {
      throw new BadRequestException(
        'La linea anterior y la nueva no pueden ser iguales',
      );
    }

    await this.validarLinea(lineaAnteriorId, empresaId);
    await this.validarLinea(lineaNuevaId, empresaId);

    const recursoAnterior = await this.asignacionRecursosRepository.findOne({
      where: {
        empresaId,
        asignacionId,
        tipoRecurso: 'linea',
        lineaTelefonicaId: lineaAnteriorId,
        estaActivo: true,
      },
    });

    if (!recursoAnterior) {
      throw new BadRequestException(
        'La asignacion no tiene la linea anterior activa para reemplazo',
      );
    }

    const recursoNuevoActivo = await this.asignacionRecursosRepository.findOne({
      where: {
        empresaId,
        lineaTelefonicaId: lineaNuevaId,
        estaActivo: true,
      },
    });

    if (recursoNuevoActivo) {
      throw new BadRequestException(
        'La linea nueva ya se encuentra asignada de forma activa',
      );
    }

    recursoAnterior.estaActivo = false;
    await this.asignacionRecursosRepository.save(recursoAnterior);

    const nuevoVinculo = this.asignacionRecursosRepository.create({
      empresaId,
      asignacionId,
      tipoRecurso: 'linea',
      lineaTelefonicaId: lineaNuevaId,
      estaActivo: true,
    });
    await this.asignacionRecursosRepository.save(nuevoVinculo);

    await this.registrarBitacora(
      user.userId,
      empresaId,
      'LINEAS_TELEFONICAS_REEMPLAZO',
      'asignacion_recursos',
      nuevoVinculo.id,
      {
        lineaAnteriorId,
      },
      {
        lineaNuevaId,
        asignacionId,
      },
    );

    return { ok: true };
  }

  async getPersonaLineaTrace(
    user: AuthenticatedUser,
    filters?: PersonaLineaTraceFilters,
  ): Promise<PersonaLineaTraceItem[]> {
    const query = this.asignacionRecursosRepository
      .createQueryBuilder('recurso')
      .innerJoin(
        Asignacion,
        'asignacion',
        'asignacion.id = recurso.asignacion_id AND asignacion.empresa_id = :empresaId',
        { empresaId: user.empresaId },
      )
      .innerJoin(
        LineaTelefonica,
        'linea',
        'linea.id = recurso.linea_telefonica_id AND linea.empresa_id = :empresaId',
      )
      .leftJoin(
        Persona,
        'persona',
        'persona.id = asignacion.persona_id AND persona.empresa_id = :empresaId',
      )
      .where('recurso.empresa_id = :empresaId', { empresaId: user.empresaId })
      .andWhere("recurso.tipo_recurso = 'linea'")
      .select([
        'recurso.id AS recurso_id',
        'recurso.asignacion_id AS asignacion_id',
        'recurso.linea_telefonica_id AS linea_telefonica_id',
        'recurso.esta_activo AS recurso_activo',
        'recurso.created_at AS recurso_created_at',
        'linea.numero AS linea_numero',
        'asignacion.persona_id AS persona_id',
        'asignacion.estado AS asignacion_estado',
        "CONCAT(COALESCE(persona.nombres, ''), CASE WHEN persona.apellidos IS NULL THEN '' ELSE CONCAT(' ', persona.apellidos) END) AS persona_nombre",
      ]);

    if (filters?.personaId) {
      query.andWhere('asignacion.persona_id = :personaId', {
        personaId: filters.personaId,
      });
    }

    if (filters?.lineaTelefonicaId) {
      query.andWhere('recurso.linea_telefonica_id = :lineaTelefonicaId', {
        lineaTelefonicaId: filters.lineaTelefonicaId,
      });
    }

    if (filters?.soloActivas !== false) {
      query.andWhere('recurso.esta_activo = true');
    }

    const rows = await query.orderBy('recurso.created_at', 'DESC').getRawMany<{
      recurso_id: string;
      asignacion_id: string;
      linea_telefonica_id: string;
      recurso_activo: boolean;
      recurso_created_at: Date;
      linea_numero: string;
      persona_id: string | null;
      persona_nombre: string | null;
      asignacion_estado: string;
    }>();

    return rows.map((row) => ({
      asignacionRecursoId: row.recurso_id,
      asignacionId: row.asignacion_id,
      lineaTelefonicaId: row.linea_telefonica_id,
      numeroLinea: row.linea_numero,
      personaId: row.persona_id ?? undefined,
      personaNombre: row.persona_nombre?.trim() || undefined,
      estadoAsignacion: row.asignacion_estado,
      recursoActivo: !!row.recurso_activo,
      asignadoEn: new Date(row.recurso_created_at),
    }));
  }

  private async validarLinea(
    lineaId: string,
    empresaId: string,
  ): Promise<void> {
    const linea = await this.lineasRepository.findOne({
      where: {
        id: lineaId,
        empresaId,
      },
    });

    if (!linea) {
      throw new NotFoundException(
        'Linea telefonica no encontrada para la empresa indicada',
      );
    }
  }

  private async validarAsignacion(
    asignacionId: string,
    empresaId: string,
  ): Promise<void> {
    const asignacion = await this.asignacionesRepository.findOne({
      where: {
        id: asignacionId,
        empresaId,
      },
    });

    if (!asignacion) {
      throw new NotFoundException(
        'Asignacion no encontrada para la empresa indicada',
      );
    }
  }

  private async validarNumeroUnico(
    empresaId: string,
    numero: string,
    excludeId?: string,
  ): Promise<void> {
    const existente = await this.lineasRepository.findOne({
      where: { empresaId, numero },
    });

    if (existente && existente.id !== excludeId) {
      throw new BadRequestException(
        'Ya existe una linea telefonica con ese numero en la empresa',
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
