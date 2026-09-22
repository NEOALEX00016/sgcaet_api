import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePersonaDto } from './dto/create-persona.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Persona } from './entities/persona.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ImportPersonasManualDto } from './dto/import-personas-manual.dto';
import { ImportPersonaItemDto } from './dto/import-persona-item.dto';
import { FuentesEmpleado } from '../fuentes-empleados/entities/fuentes-empleado.entity';
import { EjecucionesCargaEmpleado } from '../ejecuciones-carga-empleados/entities/ejecuciones-carga-empleado.entity';
import { ImportPersonasApiDto } from './dto/import-personas-api.dto';
import { EstructuraOrganizacionalNodo } from '../estructura-organizacional-nodos/entities/estructura-organizacional-nodo.entity';
import { PersonaEstructuraOrganizacional } from '../persona-estructura-organizacional/entities/persona-estructura-organizacional.entity';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { SecretsService } from '../common/security/secrets.service';
import { EventosPersonaLaboral } from '../eventos-persona-laboral/entities/eventos-persona-laboral.entity';
import { Asignacion } from '../asignaciones/entities/asignacione.entity';
import { AsignacionRecurso } from '../asignacion-recursos/entities/asignacion-recurso.entity';

@Injectable()
export class PersonasService {
  constructor(
    @InjectRepository(Persona)
    private readonly personasRepository: Repository<Persona>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    @InjectRepository(FuentesEmpleado)
    private readonly fuentesRepository: Repository<FuentesEmpleado>,
    @InjectRepository(EjecucionesCargaEmpleado)
    private readonly ejecucionesRepository: Repository<EjecucionesCargaEmpleado>,
    @InjectRepository(EstructuraOrganizacionalNodo)
    private readonly estructuraNodosRepository: Repository<EstructuraOrganizacionalNodo>,
    @InjectRepository(PersonaEstructuraOrganizacional)
    private readonly personaEstructuraRepository: Repository<PersonaEstructuraOrganizacional>,
    @InjectRepository(EventosPersonaLaboral)
    private readonly eventosLaboralesRepository: Repository<EventosPersonaLaboral>,
    @InjectRepository(Asignacion)
    private readonly asignacionesRepository: Repository<Asignacion>,
    @InjectRepository(AsignacionRecurso)
    private readonly asignacionRecursosRepository: Repository<AsignacionRecurso>,
    private readonly secureHttpClient: SecureHttpClientService,
    private readonly secretsService: SecretsService,
    private readonly dataSource: DataSource,
  ) {}

  async importFromManual(
    dto: ImportPersonasManualDto,
    user: AuthenticatedUser,
  ) {
    await this.validarActor(user);
    const fuente = await this.resolveFuenteManual(dto.fuenteEmpleadosId, user.empresaId);
    const ejecucion = await this.ejecucionesRepository.save(
      this.ejecucionesRepository.create({
        empresaId: user.empresaId,
        fuenteEmpleadosId: fuente?.id,
        tipoCarga: 'manual',
        estado: 'en_proceso',
        creadaPor: user.userId,
      }),
    );

    const summary = await this.upsertImportedPersonas(
      dto.personas,
      user,
      fuente?.id,
    );
    const finalized = await this.ejecucionesRepository.save(
      this.ejecucionesRepository.merge(ejecucion, {
        estado: summary.errores > 0 ? 'fallida' : 'completada',
        totalRegistros: summary.totalRegistros,
        creados: summary.creados,
        actualizados: summary.actualizados,
        sinCambios: summary.sinCambios,
        errores: summary.errores,
        detalleError: summary.detalleError,
        finalizadaEn: new Date(),
      }),
    );

    await this.registrarBitacora(
      user,
      'PERSONAS_IMPORTAR_MANUAL',
      'ejecuciones_carga_empleados',
      finalized.id,
      null,
      {
        nombreCarga: dto.nombreCarga,
        fuenteEmpleadosId: fuente?.id,
        totalRegistros: summary.totalRegistros,
        creados: summary.creados,
        actualizados: summary.actualizados,
        errores: summary.errores,
      },
    );

    return {
      fuenteUsada: fuente
        ? {
            id: fuente.id,
            nombre: fuente.nombre,
            tipoFuente: fuente.tipoFuente,
            estado: fuente.estado,
            urlBase: fuente.urlBase ?? null,
            metodoAutenticacion: fuente.metodoAutenticacion ?? null,
          }
        : null,
      ejecucion: finalized,
      resumen: summary,
    };
  }

  async importFromApi(dto: ImportPersonasApiDto, user: AuthenticatedUser) {
    await this.validarActor(user);
    const fuente = await this.fuentesRepository
      .createQueryBuilder('fuente')
      .addSelect('fuente.secretoCifrado')
      .where('fuente.id = :id', { id: dto.fuenteEmpleadosId })
      .andWhere('fuente.empresa_id = :empresaId', { empresaId: user.empresaId })
      .getOne();
    if (!fuente) {
      throw new NotFoundException('Fuente API no encontrada para la empresa');
    }
    if (fuente.tipoFuente !== 'api_rest') {
      throw new NotFoundException('La fuente indicada no es de tipo API');
    }

    const sourceMapping = (fuente.mapeoCampos ?? {}) as Record<string, unknown>;
    const endpointConfigurado =
      typeof sourceMapping.endpointPersonas === 'string' &&
      sourceMapping.endpointPersonas.trim().length > 0
        ? sourceMapping.endpointPersonas.trim()
        : undefined;

    const endpointUsado = dto.endpointUrl?.trim()
      ? dto.endpointUrl.trim()
      : this.composeEndpoint(
          fuente.urlBase,
          endpointConfigurado ?? dto.endpointPath ?? '/empleados',
        );

    const ejecucion = await this.ejecucionesRepository.save(
      this.ejecucionesRepository.create({
        empresaId: user.empresaId,
        fuenteEmpleadosId: fuente.id,
        tipoCarga: 'incremental',
        estado: 'en_proceso',
        creadaPor: user.userId,
      }),
    );

    try {
      const allowedHost = this.secureHttpClient.extractHostname(fuente.urlBase);
      const requestHeaders: Record<string, string> = {
        Accept: 'application/json',
        ...this.buildSourceAuthHeaders(
          fuente.metodoAutenticacion,
          fuente.secretoCifrado
            ? this.secretsService.decryptString(fuente.secretoCifrado)
            : undefined,
          fuente.usuarioTecnico,
          sourceMapping,
        ),
        ...(dto.headers ?? {}),
      };

      const response = await this.secureHttpClient.request({
        url: endpointUsado,
        method: 'GET',
        headers: requestHeaders,
        timeoutMs: dto.timeoutMs ?? 10000,
        allowedHosts: allowedHost ? [allowedHost] : undefined,
      });
      if (!response.ok) {
        throw new Error(`La API externa respondio HTTP ${response.status}`);
      }
      if (!response.jsonValid) {
        throw new Error('La API externa no devolvio JSON valido');
      }
      const payload = response.json as unknown;
      const items = this.extractApiItems(payload);
      const normalized = items.map((item, index) =>
        this.normalizeExternalPersona(item, sourceMapping, index),
      );
      const summary = await this.upsertImportedPersonas(normalized, user, fuente.id);

      const finalized = await this.ejecucionesRepository.save(
        this.ejecucionesRepository.merge(ejecucion, {
          estado: summary.errores > 0 ? 'fallida' : 'completada',
          totalRegistros: summary.totalRegistros,
          creados: summary.creados,
          actualizados: summary.actualizados,
          sinCambios: summary.sinCambios,
          errores: summary.errores,
          detalleError: summary.detalleError,
          finalizadaEn: new Date(),
        }),
      );

      await this.registrarBitacora(
        user,
        'PERSONAS_IMPORTAR_API',
        'ejecuciones_carga_empleados',
        finalized.id,
        null,
        {
          fuenteEmpleadosId: fuente.id,
          endpointUsado,
          totalRegistros: summary.totalRegistros,
          creados: summary.creados,
          actualizados: summary.actualizados,
          errores: summary.errores,
        },
      );

      return {
        fuenteUsada: {
          id: fuente.id,
          nombre: fuente.nombre,
          tipoFuente: fuente.tipoFuente,
          estado: fuente.estado,
          urlBase: fuente.urlBase ?? null,
          metodoAutenticacion: fuente.metodoAutenticacion ?? null,
          endpointUsado,
        },
        contratoApiEsperado: {
          metodo: 'GET',
          pathSugerido: '/empleados',
          auth: 'Bearer token opcional segun configuracion',
          respuesta: [
            {
              codigoInterno: 'EMP-001',
              nombres: 'Ana',
              apellidos: 'Perez',
              tipoDocumento: 'cedula',
              numeroDocumento: '00112345678',
              correo: 'ana@empresa.com',
              telefono: '8090000000',
              estado: 'activo',
            },
          ],
        },
        ejecucion: finalized,
        resumen: summary,
      };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No se pudo consumir la API externa';
      const failed = await this.ejecucionesRepository.save(
        this.ejecucionesRepository.merge(ejecucion, {
          estado: 'fallida',
          errores: 1,
          detalleError: message,
          finalizadaEn: new Date(),
        }),
      );
      await this.registrarBitacora(
        user,
        'PERSONAS_IMPORTAR_API',
        'ejecuciones_carga_empleados',
        failed.id,
        null,
        {
          fuenteEmpleadosId: fuente.id,
          endpointUsado,
          error: message,
        },
      );
      throw error;
    }
  }

  async getRegularizacionPendientes(user: AuthenticatedUser) {
    await this.validarActor(user);
    const salidas = await this.eventosLaboralesRepository.find({
      where: {
        empresaId: user.empresaId,
        tipoEvento: 'salida_detectada',
      },
      order: { detectadoEn: 'DESC' },
      take: 100,
    });

    const personasIds = Array.from(new Set(salidas.map((item) => item.personaId)));
    if (personasIds.length === 0) {
      return [];
    }

    const activas = await this.asignacionesRepository.find({
      where: personasIds.map((personaId) => ({
        empresaId: user.empresaId,
        personaId,
        fechaRealDevolucion: IsNull(),
      })),
      order: { createdAt: 'DESC' },
    });

    if (activas.length === 0) {
      return [];
    }

    const asignacionesIds = activas.map((item) => item.id);
    const recursosActivos = await this.asignacionRecursosRepository.find({
      where: asignacionesIds.map((asignacionId) => ({
        empresaId: user.empresaId,
        asignacionId,
        estaActivo: true,
      })),
      order: { createdAt: 'DESC' },
    });

    const personaById = new Map<string, Persona>();
    const personas = await this.personasRepository.find({
      where: personasIds.map((id) => ({ empresaId: user.empresaId, id })),
    });
    personas.forEach((item) => personaById.set(item.id, item));

    const salidaByPersona = new Map<string, EventosPersonaLaboral>();
    for (const salida of salidas) {
      if (!salidaByPersona.has(salida.personaId)) {
        salidaByPersona.set(salida.personaId, salida);
      }
    }

    return activas
      .map((asignacion) => {
        const persona = asignacion.personaId
          ? personaById.get(asignacion.personaId)
          : undefined;
        const salida = asignacion.personaId
          ? salidaByPersona.get(asignacion.personaId)
          : undefined;
        const recursos = recursosActivos.filter(
          (item) => item.asignacionId === asignacion.id,
        );
        return {
          personaId: asignacion.personaId,
          personaCodigoInterno: persona?.codigoInterno,
          personaNombreCompleto: persona
            ? `${persona.nombres} ${persona.apellidos}`.trim()
            : undefined,
          asignacionId: asignacion.id,
          asignacionEstado: asignacion.estado,
          fechaAsignacion: asignacion.fechaAsignacion,
          salidaDetectadaEn: salida?.detectadoEn,
          salidaEventoId: salida?.id,
          recursosActivos: recursos.map((recurso) => ({
            id: recurso.id,
            tipoRecurso: recurso.tipoRecurso,
            activoId: recurso.activoId,
            lineaTelefonicaId: recurso.lineaTelefonicaId,
          })),
        };
      })
      .filter((item) => item.recursosActivos.length > 0);
  }

  async create(
    createPersonaDto: CreatePersonaDto,
    user: AuthenticatedUser,
  ): Promise<Persona> {
    await this.validarActor(user);

    const persona = this.personasRepository.create({
      ...createPersonaDto,
      empresaId: user.empresaId,
      tipoDocumento: createPersonaDto.tipoDocumento ?? 'cedula',
      estado: createPersonaDto.estado ?? 'activo',
    });
    const saved = await this.personasRepository.save(persona);

    await this.registrarBitacora(
      user,
      'PERSONAS_CREAR',
      'personas',
      saved.id,
      null,
      {
        codigoInterno: saved.codigoInterno,
        tipoDocumento: saved.tipoDocumento,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async findAll(user: AuthenticatedUser): Promise<Persona[]> {
    const whereBase = { deletedAt: IsNull() };
    return this.personasRepository.find({
      where: { ...whereBase, empresaId: user.empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: AuthenticatedUser): Promise<Persona> {
    const persona = await this.personasRepository.findOne({
      where: {
        id,
        empresaId: user.empresaId,
        deletedAt: IsNull(),
      },
    });

    if (!persona) {
      throw new NotFoundException(`Persona ${id} no encontrada`);
    }

    return persona;
  }

  async update(
    id: string,
    updatePersonaDto: UpdatePersonaDto,
    user: AuthenticatedUser,
  ): Promise<Persona> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    const merged = this.personasRepository.merge(actual, updatePersonaDto);
    const saved = await this.personasRepository.save(merged);

    await this.registrarBitacora(
      user,
      'PERSONAS_ACTUALIZAR',
      'personas',
      saved.id,
      {
        nombres: actual.nombres,
        apellidos: actual.apellidos,
        estado: actual.estado,
      },
      {
        nombres: saved.nombres,
        apellidos: saved.apellidos,
        estado: saved.estado,
      },
    );

    return saved;
  }

  async remove(id: string, user: AuthenticatedUser): Promise<void> {
    const actual = await this.findOne(id, user);
    await this.validarActor(user);

    actual.deletedAt = new Date();
    actual.estado = 'inactivo';
    await this.personasRepository.save(actual);

    await this.registrarBitacora(
      user,
      'PERSONAS_DESACTIVAR',
      'personas',
      actual.id,
      {
        estado: 'activo',
      },
      {
        estado: actual.estado,
        deletedAt: actual.deletedAt.toISOString(),
      },
    );
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

  private async resolveFuenteManual(fuenteEmpleadosId: string | undefined, empresaId: string) {
    if (!fuenteEmpleadosId) {
      return null;
    }
    const fuente = await this.fuentesRepository.findOne({
      where: {
        id: fuenteEmpleadosId,
        empresaId,
      },
    });
    if (!fuente) {
      throw new NotFoundException('Fuente manual no encontrada para la empresa');
    }
    if (fuente.tipoFuente !== 'archivo_csv') {
      throw new NotFoundException('La fuente indicada no es de tipo manual (archivo)');
    }
    return fuente;
  }

  private async upsertImportedPersonas(
    items: ImportPersonaItemDto[],
    user: AuthenticatedUser,
    fuenteEmpleadosId?: string,
  ) {
    const summary = {
      totalRegistros: items.length,
      creados: 0,
      actualizados: 0,
      sinCambios: 0,
      errores: 0,
      detalleError: '' as string | undefined,
    };

    for (const item of items) {
      try {
        const outcome = await this.dataSource.transaction(async (manager) => {
          const personasRepository = manager.getRepository(Persona);
          const estructuraNodosRepository =
            manager.getRepository(EstructuraOrganizacionalNodo);
          const personaEstructuraRepository = manager.getRepository(
            PersonaEstructuraOrganizacional,
          );

          const codigoInterno = item.codigoInterno.trim();
          const numeroDocumento = item.numeroDocumento.trim();
          const identificadorExterno = item.identificadorExterno?.trim() || undefined;
          const whereCandidates: Array<Partial<Persona>> = [];
          if (identificadorExterno && fuenteEmpleadosId) {
            whereCandidates.push({
              empresaId: user.empresaId,
              fuenteEmpleadosId,
              identificadorExterno,
            });
          }
          whereCandidates.push(
            {
              empresaId: user.empresaId,
              codigoInterno,
            },
            {
              empresaId: user.empresaId,
              numeroDocumento,
            },
          );
          const existente = await personasRepository.findOne({
            where: whereCandidates,
          });

          if (!existente) {
            const created = personasRepository.create({
              empresaId: user.empresaId,
              codigoInterno,
              nombres: item.nombres.trim(),
              apellidos: item.apellidos.trim(),
              tipoDocumento: item.tipoDocumento ?? 'cedula',
              numeroDocumento,
              identificadorExterno,
              fuenteEmpleadosId,
              origenRegistro: 'integracion',
              correo: item.correo?.trim() || undefined,
              telefono: item.telefono?.trim() || undefined,
              estado: item.estado ?? 'activo',
            });
            const savedCreated = await personasRepository.save(created);
            await this.syncOrganizationalStructureForPersona(
              savedCreated.id,
              item,
              user,
              estructuraNodosRepository,
              personaEstructuraRepository,
            );
            return 'creado';
          }

          const before = JSON.stringify({
            codigoInterno: existente.codigoInterno,
            nombres: existente.nombres,
            apellidos: existente.apellidos,
            tipoDocumento: existente.tipoDocumento,
            numeroDocumento: existente.numeroDocumento,
            identificadorExterno: existente.identificadorExterno ?? '',
            fuenteEmpleadosId: existente.fuenteEmpleadosId ?? null,
            origenRegistro: existente.origenRegistro,
            correo: existente.correo ?? '',
            telefono: existente.telefono ?? '',
            estado: existente.estado,
            deletedAt: existente.deletedAt ? existente.deletedAt.toISOString() : null,
          });

          existente.codigoInterno = codigoInterno;
          existente.nombres = item.nombres.trim();
          existente.apellidos = item.apellidos.trim();
          existente.tipoDocumento = item.tipoDocumento ?? 'cedula';
          existente.numeroDocumento = numeroDocumento;
          existente.identificadorExterno = identificadorExterno;
          existente.fuenteEmpleadosId = fuenteEmpleadosId;
          existente.origenRegistro = 'integracion';
          existente.correo = item.correo?.trim() || undefined;
          existente.telefono = item.telefono?.trim() || undefined;
          existente.estado = item.estado ?? 'activo';
          existente.deletedAt = undefined;

          const after = JSON.stringify({
            codigoInterno: existente.codigoInterno,
            nombres: existente.nombres,
            apellidos: existente.apellidos,
            tipoDocumento: existente.tipoDocumento,
            numeroDocumento: existente.numeroDocumento,
            identificadorExterno: existente.identificadorExterno ?? '',
            fuenteEmpleadosId: existente.fuenteEmpleadosId ?? null,
            origenRegistro: existente.origenRegistro,
            correo: existente.correo ?? '',
            telefono: existente.telefono ?? '',
            estado: existente.estado,
            deletedAt: null,
          });

          if (before === after) {
            await this.syncOrganizationalStructureForPersona(
              existente.id,
              item,
              user,
              estructuraNodosRepository,
              personaEstructuraRepository,
            );
            return 'sinCambios';
          }

          const savedUpdated = await personasRepository.save(existente);
          await this.syncOrganizationalStructureForPersona(
            savedUpdated.id,
            item,
            user,
            estructuraNodosRepository,
            personaEstructuraRepository,
          );
          return 'actualizado';
        });

        if (outcome === 'creado') {
          summary.creados += 1;
        } else if (outcome === 'actualizado') {
          summary.actualizados += 1;
        } else {
          summary.sinCambios += 1;
        }
      } catch (error) {
        summary.errores += 1;
        const message =
          error instanceof Error ? error.message : 'Error desconocido durante importacion';
        summary.detalleError = summary.detalleError
          ? `${summary.detalleError}; ${message}`
          : message;
      }
    }

    return summary;
  }

  private composeEndpoint(urlBase: string | undefined, endpointPath: string) {
    if (!urlBase?.trim()) {
      throw new NotFoundException('La fuente API no tiene URL base configurada');
    }
    const normalizedBase = urlBase.endsWith('/') ? urlBase.slice(0, -1) : urlBase;
    const normalizedPath = endpointPath.startsWith('/')
      ? endpointPath
      : `/${endpointPath}`;
    return `${normalizedBase}${normalizedPath}`;
  }

  private buildSourceAuthHeaders(
    method: string | undefined,
    secret: string | undefined,
    technicalUser: string | undefined,
    mapping: Record<string, unknown>,
  ) {
    const authMethod = (method ?? '').toLowerCase();
    const headers: Record<string, string> = {};
    if (!authMethod || !secret) {
      return headers;
    }

    if (authMethod === 'bearer') {
      headers.Authorization = `Bearer ${secret}`;
      return headers;
    }

    if (authMethod === 'api_key') {
      const headerName =
        typeof mapping.apiKeyHeaderName === 'string' &&
        mapping.apiKeyHeaderName.trim().length > 0
          ? mapping.apiKeyHeaderName.trim()
          : 'x-api-key';
      headers[headerName] = secret;
      return headers;
    }

    if (authMethod === 'basic') {
      const token = Buffer.from(`${technicalUser ?? ''}:${secret}`).toString(
        'base64',
      );
      headers.Authorization = `Basic ${token}`;
      return headers;
    }

    return headers;
  }

  private extractApiItems(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) {
      return payload.filter(item => !!item && typeof item === 'object') as Record<
        string,
        unknown
      >[];
    }
    if (payload && typeof payload === 'object') {
      const candidate = payload as { personas?: unknown; items?: unknown };
      if (Array.isArray(candidate.personas)) {
        return candidate.personas.filter(item => !!item && typeof item === 'object') as Record<
          string,
          unknown
        >[];
      }
      if (Array.isArray(candidate.items)) {
        return candidate.items.filter(item => !!item && typeof item === 'object') as Record<
          string,
          unknown
        >[];
      }
    }
    throw new NotFoundException(
      'La API externa debe responder un arreglo o un objeto con propiedad personas/items',
    );
  }

  private normalizeExternalPersona(
    row: Record<string, unknown>,
    mapeoCampos: Record<string, unknown>,
    rowIndex = 0,
  ): ImportPersonaItemDto {
    const mapped = (name: string, fallback: string) => {
      const mapKey = mapeoCampos[name];
      const sourceKey =
        typeof mapKey === 'string' && mapKey.trim().length > 0 ? mapKey : fallback;
      const value = row[sourceKey];
      return typeof value === 'string' ? value.trim() : '';
    };

    const tipoDoc = mapped('tipoDocumento', 'tipoDocumento');
    const estado = mapped('estado', 'estado');
    const uniqueIdentifierField =
      typeof mapeoCampos.uniqueIdentifier === 'string' &&
      mapeoCampos.uniqueIdentifier.trim().length > 0
        ? mapeoCampos.uniqueIdentifier.trim()
        : 'idExterno';
    const identificadorExterno =
      mapped('identificadorExterno', uniqueIdentifierField) ||
      mapped('idExterno', 'idExterno') ||
      mapped('codigoEmpleado', 'codigoEmpleado') ||
      undefined;

    const extractNodesFromOrgAssignments = () => {
      const orgAssignmentsKey =
        typeof mapeoCampos.orgAssignments === 'string'
          ? mapeoCampos.orgAssignments
          : 'orgAssignments';
      const raw = row[orgAssignmentsKey];
      const records = Array.isArray(raw)
        ? raw
        : raw && typeof raw === 'object'
          ? [raw]
          : [];
      if (!records.length) return [];

      const mappedRecords = records
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => item as Record<string, unknown>);

      const hasDetailedShape = mappedRecords.some(
        (item) =>
          item.tipoNodo !== undefined ||
          item.type !== undefined ||
          item.nodoExternoId !== undefined ||
          item.codigo !== undefined,
      );

      if (hasDetailedShape) {
        return mappedRecords
          .map((item) => ({
            tipoNodo: String(item.tipoNodo ?? item.type ?? '').trim(),
            tipoNodoId:
              String(item.tipoNodoId ?? item.nodeTypeId ?? '').trim() || undefined,
            codigo: String(item.nodoExternoId ?? item.codigo ?? '').trim(),
            nombre: String(item.nombre ?? item.name ?? '').trim(),
            nodoPadreCodigo: String(
              item.nodoPadreExternoId ?? item.parentId ?? '',
            ).trim(),
          }))
          .filter((item) => item.tipoNodo && item.codigo && item.nombre);
      }

      if (mappedRecords.length !== 1) {
        throw new BadRequestException(
          `Fila ${rowIndex + 1}: orgAssignments en formato compacto debe contener una sola estructura por persona.`,
        );
      }

      const compact = mappedRecords[0];
      const entries = Object.entries(compact)
        .map(([tipoNodo, valor]) => {
          const nombre =
            typeof valor === 'string'
              ? valor.trim()
              : valor === null || valor === undefined
                ? ''
                : String(valor).trim();
          return { tipoNodo: tipoNodo.trim(), nombre };
        })
        .filter((item) => item.tipoNodo.length > 0 && item.nombre.length > 0);

      if (!entries.length) {
        return [];
      }

      let parentCode: string | undefined;
      return entries.map((item) => {
        const codigo = this.slugValue(`${item.tipoNodo}-${item.nombre}`);
        const built = {
          tipoNodo: item.tipoNodo,
          codigo,
          nombre: item.nombre,
          nodoPadreCodigo: parentCode,
        };
        parentCode = codigo;
        return built;
      });
    };

    const parseStructureTemplateLevels = () => {
      const raw = mapeoCampos.structureTemplateLevels;
      if (!Array.isArray(raw)) return [];
      return raw
        .filter((item) => !!item && typeof item === 'object')
        .map((item) => item as Record<string, unknown>)
        .map((item) => ({
          tipoNodo: String(item.tipoNodo ?? '').trim(),
          sourceField: String(item.sourceField ?? '').trim(),
          required: Boolean(item.required),
        }))
        .filter((item) => item.tipoNodo.length > 0 && item.sourceField.length > 0);
    };

    const deriveNodesFromTemplate = () => {
      const levels = parseStructureTemplateLevels();
      if (!levels.length) {
        throw new BadRequestException(
          'Configuracion invalida: structureTemplateLevels debe tener al menos un nivel.',
        );
      }

      const nodes: Array<{
        tipoNodo: string;
        tipoNodoId?: string;
        codigo: string;
        nombre: string;
        nodoPadreCodigo?: string;
      }> = [];
      let parentCode: string | undefined;
      let prevMissingLevel = false;

      for (const level of levels) {
        const rawValue = row[level.sourceField];
        const value =
          typeof rawValue === 'string'
            ? rawValue.trim()
            : rawValue === null || rawValue === undefined
              ? ''
              : String(rawValue).trim();

        if (!value) {
          if (level.required) {
            throw new BadRequestException(
              `Fila ${rowIndex + 1}: falta el campo requerido \"${level.sourceField}\" para el nivel \"${level.tipoNodo}\".`,
            );
          }
          prevMissingLevel = true;
          continue;
        }

        if (prevMissingLevel) {
          throw new BadRequestException(
            `Fila ${rowIndex + 1}: jerarquia invalida. El nivel \"${level.tipoNodo}\" no puede tener valor si falta un nivel anterior.`,
          );
        }

        const code = this.slugValue(`${level.tipoNodo}-${value}`);
        nodes.push({
          tipoNodo: level.tipoNodo,
          codigo: code,
          nombre: value,
          nodoPadreCodigo: parentCode,
        });
        parentCode = code;
      }

      if (!nodes.length) {
        throw new BadRequestException(
          `Fila ${rowIndex + 1}: no se pudo construir estructura desde la plantilla configurada.`,
        );
      }

      return nodes;
    };

    const deriveDefaultStaticNodes = () => {
      const departamento = mapped('departamento', 'departamento');
      const oficina = mapped('oficina', 'oficina');
      const direccion = mapped('direccionOficina', 'direccionOficina');
      const nodes: Array<{
        tipoNodo: string;
        tipoNodoId?: string;
        codigo: string;
        nombre: string;
        nodoPadreCodigo?: string;
      }> = [];
      if (departamento) {
        nodes.push({
          tipoNodo: 'departamento',
          codigo: this.slugValue(`departamento-${departamento}`),
          nombre: departamento,
        });
      }
      if (oficina) {
        nodes.push({
          tipoNodo: 'oficina',
          codigo: this.slugValue(`oficina-${oficina}`),
          nombre: oficina,
          nodoPadreCodigo: departamento
            ? this.slugValue(`departamento-${departamento}`)
            : undefined,
        });
      }
      if (direccion) {
        nodes.push({
          tipoNodo: 'direccion',
          codigo: this.slugValue(`direccion-${direccion}`),
          nombre: direccion,
          nodoPadreCodigo: oficina
            ? this.slugValue(`oficina-${oficina}`)
            : departamento
              ? this.slugValue(`departamento-${departamento}`)
              : undefined,
        });
      }
      return nodes;
    };

    const structureModeRaw =
      typeof mapeoCampos.structureMode === 'string'
        ? mapeoCampos.structureMode.trim().toLowerCase()
        : 'org_assignments';
    const structureMode =
      structureModeRaw === 'jerarquia_por_campos'
        ? 'jerarquia_por_campos'
        : 'org_assignments';

    let structureNodes: Array<{
      tipoNodo: string;
      tipoNodoId?: string;
      codigo: string;
      nombre: string;
      nodoPadreCodigo?: string;
    }>;

    if (structureMode === 'jerarquia_por_campos') {
      structureNodes = deriveNodesFromTemplate();
    } else {
      const dynamicNodes = extractNodesFromOrgAssignments();
      structureNodes = dynamicNodes.length
        ? dynamicNodes
        : deriveDefaultStaticNodes();
    }

    return {
      codigoInterno: mapped('codigoInterno', 'codigoInterno'),
      nombres: mapped('nombres', 'nombres'),
      apellidos: mapped('apellidos', 'apellidos'),
      tipoDocumento: ['cedula', 'pasaporte', 'rnc', 'otro'].includes(tipoDoc)
        ? tipoDoc
        : 'cedula',
      numeroDocumento: mapped('numeroDocumento', 'numeroDocumento'),
      correo: mapped('correo', 'correo') || undefined,
      telefono: mapped('telefono', 'telefono') || undefined,
      identificadorExterno,
      estado: ['activo', 'inactivo', 'suspendido'].includes(estado)
        ? estado
        : 'activo',
      estructuraNodos: structureNodes,
    };
  }

  private async syncOrganizationalStructureForPersona(
    personaId: string,
    item: ImportPersonaItemDto,
    user: AuthenticatedUser,
    estructuraNodosRepository: Repository<EstructuraOrganizacionalNodo> =
      this.estructuraNodosRepository,
    personaEstructuraRepository: Repository<PersonaEstructuraOrganizacional> =
      this.personaEstructuraRepository,
  ) {
    const nodes = item.estructuraNodos ?? [];
    if (!nodes.length) return;

    const createdOrFoundByCode = new Map<string, EstructuraOrganizacionalNodo>();

    for (const node of nodes) {
      let current = await estructuraNodosRepository.findOne({
        where: {
          empresaId: user.empresaId,
          codigo: node.codigo,
        },
      });

      if (!current) {
        current = await estructuraNodosRepository.save(
          estructuraNodosRepository.create({
            empresaId: user.empresaId,
            tipoNodo: node.tipoNodo,
            tipoNodoId: node.tipoNodoId,
            codigo: node.codigo,
            nombre: node.nombre,
            nodoPadreId: undefined,
            estaActivo: true,
          }),
        );
      } else if (
        current.nombre !== node.nombre ||
        current.tipoNodo !== node.tipoNodo ||
        current.tipoNodoId !== node.tipoNodoId
      ) {
        current.nombre = node.nombre;
        current.tipoNodo = node.tipoNodo;
        current.tipoNodoId = node.tipoNodoId;
        current.estaActivo = true;
        current = await estructuraNodosRepository.save(current);
      }

      createdOrFoundByCode.set(node.codigo, current);
    }

    for (const node of nodes) {
      if (!node.nodoPadreCodigo) continue;
      const current = createdOrFoundByCode.get(node.codigo);
      const parent = createdOrFoundByCode.get(node.nodoPadreCodigo);
      if (current && parent && current.nodoPadreId !== parent.id) {
        current.nodoPadreId = parent.id;
        await estructuraNodosRepository.save(current);
      }
    }

    for (const node of nodes) {
      const resolved = createdOrFoundByCode.get(node.codigo);
      if (!resolved) continue;
      const exists = await personaEstructuraRepository.findOne({
        where: {
          empresaId: user.empresaId,
          personaId,
          estructuraNodoId: resolved.id,
        },
      });
      if (!exists) {
        await personaEstructuraRepository.save(
          personaEstructuraRepository.create({
            empresaId: user.empresaId,
            personaId,
            estructuraNodoId: resolved.id,
            rolEnNodo: `import-${node.tipoNodo}`,
            esPrincipal: node.tipoNodo === 'departamento',
            iniciaEn: undefined,
            finalizaEn: undefined,
          }),
        );
      }
    }
  }

  private slugValue(value: string) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60);
  }
}
