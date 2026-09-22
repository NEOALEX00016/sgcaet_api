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
import { In, IsNull, Repository } from 'typeorm';
import { FormularioRespuesta } from './entities/formulario-respuesta.entity';
import { FormularioRespuestaDetalle } from './entities/formulario-respuesta-detalle.entity';
import { FormularioVersione } from '../formulario-versiones/entities/formulario-versione.entity';
import { FormularioCampo } from '../formulario-campos/entities/formulario-campo.entity';
import { FormularioRegla } from '../formulario-reglas/entities/formulario-regla.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { Evidencia } from '../evidencias/entities/evidencia.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';

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
    const actual = await this.findOne(id, user);

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
      await this.validarRespondidoPor(payload.respondidoPor, user.empresaId);
    }

    if (detalles) {
      await this.validarDetallesYReglas(
        actual.formularioVersionId,
        detalles,
        user.empresaId,
      );
    }

    const merged = this.respuestasRepository.merge(actual, {
      ...payload,
      respondidoEn: payload.respondidoEn
        ? new Date(payload.respondidoEn)
        : actual.respondidoEn,
    });
    const saved = await this.respuestasRepository.save(merged);

    if (detalles?.length) {
      await this.detallesRepository.delete({
        formularioRespuestaId: actual.id,
      });
      await this.guardarDetalles(actual.id, actual.empresaId, detalles);
    }

    if (evidenciaIds?.length) {
      await this.vincularEvidencias(saved, evidenciaIds);
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
    );

    return this.findOne(saved.id, user);
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);

    await this.respuestasRepository.delete({ id: actual.id });

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
    );
  }

  private async guardarDetalles(
    formularioRespuestaId: string,
    empresaId: string,
    detalles: FormularioRespuestaDetalleDto[],
  ): Promise<void> {
    const detallesEntidades = detalles.map((item) =>
      this.detallesRepository.create({
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

    await this.detallesRepository.save(detallesEntidades);
  }

  private async vincularEvidencias(
    respuesta: FormularioRespuesta,
    evidenciaIds: string[],
  ): Promise<void> {
    const evidencias = await this.evidenciasRepository.find({
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
      await this.evidenciasRepository.save(evidencia);
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
  ): Promise<void> {
    const [campos, reglas] = await Promise.all([
      this.camposRepository.find({
        where: { formularioVersionId, empresaId },
      }),
      this.reglasRepository.find({
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
    const valor = valorEsperado ? `"${valorEsperado}"` : 'la condición configurada';
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
  ): Promise<void> {
    const usuario = await this.usuariosRepository.findOne({
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
