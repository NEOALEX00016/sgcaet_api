import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateFormularioRespuestaDto,
  FormularioRespuestaDetalleDto,
} from './dto/create-formulario-respuesta.dto';
import { UpdateFormularioRespuestaDto } from './dto/update-formulario-respuesta.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { FormularioRespuesta } from './entities/formulario-respuesta.entity';
import { FormularioRespuestaDetalle } from './entities/formulario-respuesta-detalle.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Evidencia } from '../evidencias/entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { FormularioReparacion } from '../formularios-reparacion/entities/formularios-reparacion.entity';

export type FormularioRespuestasFilters = {
  entidadRelacionada?: string;
  entidadRelacionadaId?: string;
  formularioVersionId?: string;
};

@Injectable()
export class FormularioRespuestasService {
  constructor(
    @InjectRepository(FormularioRespuesta)
    private readonly respuestasRepository: Repository<FormularioRespuesta>,
    @InjectRepository(FormularioRespuestaDetalle)
    private readonly detallesRepository: Repository<FormularioRespuestaDetalle>,
    @InjectRepository(FormularioVersione)
    private readonly versionesRepository: Repository<FormularioVersione>,
    @InjectRepository(FormularioCampo)
    private readonly camposRepository: Repository<FormularioCampo>,
    @InjectRepository(FormularioRegla)
    private readonly reglasRepository: Repository<FormularioRegla>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Evidencia)
    private readonly evidenciasRepository: Repository<Evidencia>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(FormularioReparacion)
    private readonly formulariosReparacionRepository: Repository<FormularioReparacion>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateFormularioRespuestaDto,
    user: AuthenticatedUser,
  ): Promise<FormularioRespuesta> {
    await this.validarVersionPublicada(
      createDto.formularioVersionId,
      user.empresaId,
    );

    const respondidoPor = createDto.respondidoPor ?? user.userId;
    await this.validarRespondidoPor(respondidoPor, user.empresaId);
    await this.validarDetallesYReglas(
      createDto.formularioVersionId,
      createDto.detalles ?? [],
      user.empresaId,
    );

    const { detalles, evidenciaIds, ...payload } = createDto;
    const respuesta = this.respuestasRepository.create({
      ...payload,
      empresaId: user.empresaId,
      respondidoPor,
      respondidoEn: payload.respondidoEn
        ? new Date(payload.respondidoEn)
        : new Date(),
    });
    const saved = await this.respuestasRepository.save(respuesta);

    if (detalles?.length) {
      await this.guardarDetalles(saved.id, saved.empresaId, detalles);
    }

    if (evidenciaIds?.length) {
      await this.vincularEvidencias(saved, evidenciaIds);
    }

    await this.registrarBitacora(
      user,
      'FORMULARIO_RESPUESTAS_CREAR',
      'formulario_respuestas',
      saved.id,
      null,
      {
        formularioVersionId: saved.formularioVersionId,
        entidadRelacionada: saved.entidadRelacionada,
        entidadRelacionadaId: saved.entidadRelacionadaId,
      },
    );

    return this.findOne(saved.id, user);
  }

  async createFromFrozenVersion(
    createDto: CreateFormularioRespuestaDto,
    user: AuthenticatedUser,
    manager: EntityManager,
  ): Promise<FormularioRespuesta> {
    const versionesRepository = manager.getRepository(FormularioVersione);
    const respuestasRepository = manager.getRepository(FormularioRespuesta);
    const version = await versionesRepository.findOne({
      where: { id: createDto.formularioVersionId, empresaId: user.empresaId },
    });
    if (!version)
      throw new NotFoundException(
        'Formulario version no encontrada para la empresa indicada',
      );

    const respondidoPor = user.userId;
    await this.validarRespondidoPor(respondidoPor, user.empresaId, manager);
    await this.validarDetallesYReglas(
      createDto.formularioVersionId,
      createDto.detalles ?? [],
      user.empresaId,
      manager,
    );
    const {
      detalles,
      evidenciaIds,
      respondidoPor: _ignoredActor,
      respondidoEn: _ignoredTime,
      firmaUrl: _ignoredSignature,
      ...payload
    } = createDto;
    const saved = await respuestasRepository.save(
      respuestasRepository.create({
        ...payload,
        empresaId: user.empresaId,
        respondidoPor,
        respondidoEn: new Date(),
      }),
    );
    if (detalles?.length)
      await this.guardarDetalles(saved.id, saved.empresaId, detalles, manager);
    if (evidenciaIds?.length)
      await this.vincularEvidencias(saved, evidenciaIds, manager);
    await this.registrarBitacora(
      user,
      'FORMULARIO_RESPUESTAS_CREAR',
      'formulario_respuestas',
      saved.id,
      null,
      {
        formularioVersionId: saved.formularioVersionId,
        entidadRelacionada: saved.entidadRelacionada,
        entidadRelacionadaId: saved.entidadRelacionadaId,
      },
      manager,
    );
    return saved;
  }

  async findAll(
    user: AuthenticatedUser,
    filters: FormularioRespuestasFilters = {},
  ): Promise<FormularioRespuesta[]> {
    const where: Partial<FormularioRespuesta> = { empresaId: user.empresaId };
    if (filters.entidadRelacionada) {
      where.entidadRelacionada = filters.entidadRelacionada;
    }
    if (filters.entidadRelacionadaId) {
      where.entidadRelacionadaId = filters.entidadRelacionadaId;
    }
    if (filters.formularioVersionId) {
      where.formularioVersionId = filters.formularioVersionId;
    }

    return this.respuestasRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: string,
    user: AuthenticatedUser,
  ): Promise<FormularioRespuesta> {
    const respuesta = await this.respuestasRepository.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!respuesta) {
      throw new NotFoundException(`Formulario respuesta ${id} no encontrada`);
    }

    return respuesta;
  }

  async update(
    id: string,
    updateDto: UpdateFormularioRespuestaDto,
    user: AuthenticatedUser,
  ): Promise<FormularioRespuesta> {
    return this.dataSource.transaction(async (manager) => {
      const respuestasRepository = manager.getRepository(FormularioRespuesta);
      const detallesRepository = manager.getRepository(
        FormularioRespuestaDetalle,
      );
      const actual = await respuestasRepository.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Formulario respuesta ${id} no encontrada`);
      await this.assertMutableWorkshopResponse(id, user.empresaId, manager);

    if (
      updateDto.formularioVersionId &&
      updateDto.formularioVersionId !== actual.formularioVersionId
    ) {
      throw new BadRequestException(
        'No se puede cambiar formularioVersionId de una respuesta existente',
      );
    }

    const { detalles, evidenciaIds, ...payload } = updateDto;

    if (payload.respondidoPor) {
      await this.validarRespondidoPor(
        payload.respondidoPor,
        user.empresaId,
        manager,
      );
    }

    if (detalles) {
      await this.validarDetallesYReglas(
        actual.formularioVersionId,
        detalles,
        user.empresaId,
        manager,
      );
    }

    const merged = respuestasRepository.merge(actual, {
      ...payload,
      respondidoEn: payload.respondidoEn
        ? new Date(payload.respondidoEn)
        : actual.respondidoEn,
    });
    const saved = await respuestasRepository.save(merged);

    if (detalles?.length) {
      await detallesRepository.delete({
        formularioRespuestaId: actual.id,
      });
      await this.guardarDetalles(actual.id, actual.empresaId, detalles, manager);
    }

    if (evidenciaIds?.length) {
      await this.vincularEvidencias(saved, evidenciaIds, manager);
    }

    await this.registrarBitacora(
      user,
      'FORMULARIO_RESPUESTAS_ACTUALIZAR',
      'formulario_respuestas',
      saved.id,
      {
        firmaUrl: actual.firmaUrl ?? null,
        respondidoEn: actual.respondidoEn.toISOString(),
      },
      {
        firmaUrl: saved.firmaUrl ?? null,
        respondidoEn: saved.respondidoEn.toISOString(),
      },
      manager,
    );

      return saved;
    });
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(FormularioRespuesta);
      const actual = await repository.findOne({
        where: { id, empresaId: user.empresaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!actual)
        throw new NotFoundException(`Formulario respuesta ${id} no encontrada`);
      await this.assertMutableWorkshopResponse(id, user.empresaId, manager);
      await repository.delete({ id: actual.id, empresaId: user.empresaId });

    await this.registrarBitacora(
      user,
      'FORMULARIO_RESPUESTAS_ELIMINAR',
      'formulario_respuestas',
      actual.id,
      {
        formularioVersionId: actual.formularioVersionId,
        entidadRelacionada: actual.entidadRelacionada,
      },
      null,
      manager,
    );
    });
  }

  private async assertMutableWorkshopResponse(
    responseId: string,
    empresaId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(FormularioReparacion) ??
      this.formulariosReparacionRepository;
    const completed = await repository.findOne({
      where: {
        empresaId,
        formularioRespuestaId: responseId,
        estado: 'completado',
      },
    });
    if (completed) {
      throw new BadRequestException(
        'La respuesta de un formulario de taller completado es inmutable',
      );
    }
  }

  private async guardarDetalles(
    formularioRespuestaId: string,
    empresaId: string,
    detalles: FormularioRespuestaDetalleDto[],
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(FormularioRespuestaDetalle) ??
      this.detallesRepository;
    const detallesEntidades = detalles.map((item) =>
      repository.create({
        empresaId,
        formularioRespuestaId,
        campoClave: item.campoClave,
        valorTexto: item.valorTexto,
        valorNumero:
          typeof item.valorNumero === 'number'
            ? item.valorNumero.toFixed(4)
            : undefined,
        valorBooleano: item.valorBooleano,
        valorFecha: item.valorFecha ? new Date(item.valorFecha) : undefined,
        valorJson: item.valorJson,
      }),
    );

    await repository.save(detallesEntidades);
  }

  private async vincularEvidencias(
    respuesta: FormularioRespuesta,
    evidenciaIds: string[],
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(Evidencia) ?? this.evidenciasRepository;
    const evidencias = await repository.find({
      where: {
        id: In(evidenciaIds),
      },
    });
    if (evidencias.length !== evidenciaIds.length) {
      throw new NotFoundException('Una o mas evidencias no existen');
    }

    for (const evidencia of evidencias) {
      if (evidencia.empresaId !== respuesta.empresaId) {
        throw new BadRequestException(
          'No se puede vincular evidencia de otra empresa',
        );
      }

      evidencia.entidadRelacionada = 'formulario_respuestas';
      evidencia.entidadRelacionadaId = respuesta.id;
      await repository.save(evidencia);
    }
  }

  private async validarVersionPublicada(
    formularioVersionId: string,
    empresaId: string,
  ): Promise<void> {
    const version = await this.versionesRepository.findOne({
      where: {
        id: formularioVersionId,
        empresaId,
      },
    });

    if (!version) {
      throw new NotFoundException(
        'Formulario version no encontrada para la empresa indicada',
      );
    }

    if (version.estado !== 'publicada') {
      throw new BadRequestException(
        'Solo se aceptan respuestas para versiones publicadas',
      );
    }
  }

  private async validarDetallesYReglas(
    formularioVersionId: string,
    detalles: FormularioRespuestaDetalleDto[],
    empresaId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const camposRepository =
      manager?.getRepository(FormularioCampo) ?? this.camposRepository;
    const reglasRepository =
      manager?.getRepository(FormularioRegla) ?? this.reglasRepository;
    const [campos, reglas] = await Promise.all([
      camposRepository.find({
        where: { formularioVersionId, empresaId },
      }),
      reglasRepository.find({
        where: { formularioVersionId, empresaId },
      }),
    ]);

    const errores: string[] = [];
    const detallesByClave = new Map(
      detalles.map((detalle) => [detalle.campoClave, detalle]),
    );

    for (const campo of campos) {
      if (!campo.requerido) {
        continue;
      }
      const detalle = detallesByClave.get(campo.clave);
      if (!this.detalleTieneValor(detalle)) {
        errores.push(
          `Campo obligatorio sin respuesta: "${campo.etiqueta}" (${campo.clave}).`,
        );
      }
    }

    const camposById = new Map(campos.map((campo) => [campo.id, campo]));
    for (const regla of reglas) {
      const campoOrigen = camposById.get(regla.campoOrigenId);
      const campoDestino = camposById.get(regla.campoDestinoId);
      if (!campoOrigen || !campoDestino) {
        continue;
      }

      const cumple = this.evaluarRegla(
        regla.operador,
        detallesByClave.get(campoOrigen.clave),
        regla.valorEsperado,
      );
      if (!cumple) {
        continue;
      }

      if (['mostrar', 'habilitar', 'obligatorio'].includes(regla.accion)) {
        const detalleDestino = detallesByClave.get(campoDestino.clave);
        if (!this.detalleTieneValor(detalleDestino)) {
          errores.push(
            `Regla no cumplida para "${campoDestino.etiqueta}": cuando "${campoOrigen.etiqueta}" ${this.describirOperador(regla.operador, regla.valorEsperado)}, el campo destino debe tener respuesta.`,
          );
        }
      }
    }

    if (errores.length > 0) {
      throw new BadRequestException(errores);
    }
  }

  private detalleTieneValor(
    detalle: FormularioRespuestaDetalleDto | undefined,
  ): boolean {
    if (!detalle) {
      return false;
    }

    if (typeof detalle.valorBooleano === 'boolean') {
      return true;
    }

    if (typeof detalle.valorNumero === 'number') {
      return true;
    }

    if (typeof detalle.valorTexto === 'string' && detalle.valorTexto.trim()) {
      return true;
    }

    if (typeof detalle.valorFecha === 'string' && detalle.valorFecha.trim()) {
      return true;
    }

    if (detalle.valorJson && Object.keys(detalle.valorJson).length > 0) {
      return true;
    }

    return false;
  }

  private evaluarRegla(
    operador: string,
    detalleOrigen: FormularioRespuestaDetalleDto | undefined,
    valorEsperado?: string,
  ): boolean {
    const actual = this.extraerValor(detalleOrigen);
    const expected = valorEsperado ?? '';

    switch (operador) {
      case 'equals':
        return String(actual ?? '').trim() === expected;
      case 'not_equals':
        return String(actual ?? '').trim() !== expected;
      case 'contains':
        return String(actual ?? '').includes(expected);
      case 'not_contains':
        return !String(actual ?? '').includes(expected);
      case 'starts_with':
        return String(actual ?? '').startsWith(expected);
      case 'ends_with':
        return String(actual ?? '').endsWith(expected);
      case 'gt':
        return Number(actual) > Number(expected);
      case 'gte':
        return Number(actual) >= Number(expected);
      case 'lt':
        return Number(actual) < Number(expected);
      case 'lte':
        return Number(actual) <= Number(expected);
      case 'is_true':
        return actual === true || String(actual).toLowerCase() === 'true';
      case 'is_false':
        return actual === false || String(actual).toLowerCase() === 'false';
      case 'is_empty':
        return !this.detalleTieneValor(detalleOrigen);
      case 'is_not_empty':
        return this.detalleTieneValor(detalleOrigen);
      default:
        return false;
    }
  }

  private extraerValor(
    detalle: FormularioRespuestaDetalleDto | undefined,
  ): string | number | boolean | null {
    if (!detalle) {
      return null;
    }
    if (typeof detalle.valorBooleano === 'boolean') {
      return detalle.valorBooleano;
    }
    if (typeof detalle.valorNumero === 'number') {
      return detalle.valorNumero;
    }
    if (typeof detalle.valorTexto === 'string') {
      return detalle.valorTexto;
    }
    if (typeof detalle.valorFecha === 'string') {
      return detalle.valorFecha;
    }
    return null;
  }

  private describirOperador(operador: string, valorEsperado?: string): string {
    const valor = valorEsperado
      ? `"${valorEsperado}"`
      : 'la condición configurada';
    const descripcion: Record<string, string> = {
      equals: `es igual a ${valor}`,
      not_equals: `es diferente de ${valor}`,
      contains: `contiene ${valor}`,
      not_contains: `no contiene ${valor}`,
      starts_with: `inicia con ${valor}`,
      ends_with: `termina con ${valor}`,
      gt: `es mayor que ${valor}`,
      gte: `es mayor o igual que ${valor}`,
      lt: `es menor que ${valor}`,
      lte: `es menor o igual que ${valor}`,
      is_true: 'es verdadero',
      is_false: 'es falso',
      is_empty: 'está vacío',
      is_not_empty: 'no está vacío',
    };

    return descripcion[operador] ?? 'cumple la regla';
  }

  private async validarRespondidoPor(
    respondidoPor: string,
    empresaId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(Usuario) ?? this.usuariosRepository;
    const usuario = await repository.findOne({
      where: {
        id: respondidoPor,
        empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!usuario) {
      throw new NotFoundException(
        'Usuario respondidoPor no encontrado para la empresa indicada',
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
    manager?: EntityManager,
  ): Promise<void> {
    const repository =
      manager?.getRepository(BitacoraAuditoriaSistema) ??
      this.bitacoraRepository;
    const registro = repository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion,
      entidad,
      entidadId,
      valoresAnteriores: valoresAnteriores ?? undefined,
      valoresNuevos: valoresNuevos ?? undefined,
      resultado: 'exito',
    });

    await repository.save(registro);
  }
}
