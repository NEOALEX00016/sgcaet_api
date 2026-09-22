import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { CreateFuentesEmpleadoDto } from './dto/create-fuentes-empleado.dto';
import { UpdateFuentesEmpleadoDto } from './dto/update-fuentes-empleado.dto';
import { FuentesEmpleado } from './entities/fuentes-empleado.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';
import { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { SecretsService } from '../common/security/secrets.service';

type ProbarConexionResponse = {
  ok: boolean;
  httpStatus: number;
  responseTimeMs: number;
  endpoint: string;
  jsonValid: boolean;
  recordsFound: number;
  preview: Array<Record<string, unknown>>;
  jsonSample: unknown;
};

@Injectable()
export class FuentesEmpleadosService {
  constructor(
    @InjectRepository(FuentesEmpleado)
    private readonly repo: Repository<FuentesEmpleado>,
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacora: Repository<BitacoraAuditoriaSistema>,
    private readonly secureHttpClient: SecureHttpClientService,
    private readonly secretsService: SecretsService,
  ) {}
  async create(dto: CreateFuentesEmpleadoDto, user: AuthenticatedUser) {
    await this.actor(user);
    const normalized = this.normalizePayload(dto);
    normalized.mapeoCampos = this.versionedMapping(normalized.mapeoCampos, null);
    const item = await this.repo.save(
      this.repo.create({
        ...normalized,
        empresaId: user.empresaId,
        estado: dto.estado ?? 'activa',
        usaVerificacionBaja: dto.usaVerificacionBaja ?? false,
      }),
    );
    await this.log(user, 'FUENTES_EMPLEADOS_CREAR', item.id);
    return this.sanitize(item);
  }
  async findAll(empresaId: string) {
    const items = await this.repo.find({
      where: { empresaId },
      order: { nombre: 'ASC' },
    });
    return items.map((item) => this.sanitize(item));
  }
  async findOne(id: string, empresaId: string) {
    const item = await this.repo.findOne({ where: { id, empresaId } });
    if (!item) throw new NotFoundException('Fuente de empleados no encontrada');
    return this.sanitize(item);
  }
  async update(
    id: string,
    dto: UpdateFuentesEmpleadoDto,
    user: AuthenticatedUser,
  ) {
    const item = await this.repo.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Fuente de empleados no encontrada');
    await this.actor(user);
    const normalized = this.normalizePayload(dto);
    if (normalized.mapeoCampos) {
      normalized.mapeoCampos = this.versionedMapping(
        normalized.mapeoCampos,
        item.mapeoCampos,
      );
    }
    const saved = await this.repo.save(this.repo.merge(item, normalized));
    await this.log(user, 'FUENTES_EMPLEADOS_ACTUALIZAR', id);
    return this.sanitize(saved);
  }
  async remove(id: string, user: AuthenticatedUser) {
    const item = await this.repo.findOne({
      where: { id, empresaId: user.empresaId },
    });
    if (!item) throw new NotFoundException('Fuente de empleados no encontrada');
    await this.actor(user);
    item.estado = 'inactiva';
    const saved = await this.repo.save(item);
    await this.log(user, 'FUENTES_EMPLEADOS_DESACTIVAR', id);
    return this.sanitize(saved);
  }

  async probarConexion(
    id: string,
    user: AuthenticatedUser,
  ): Promise<ProbarConexionResponse> {
    await this.actor(user);
    const source = await this.repo
      .createQueryBuilder('fuente')
      .addSelect('fuente.secretoCifrado')
      .where('fuente.id = :id', { id })
      .andWhere('fuente.empresa_id = :empresaId', { empresaId: user.empresaId })
      .getOne();
    if (!source) throw new NotFoundException('Fuente de empleados no encontrada');
    if (source.tipoFuente !== 'api_rest') {
      throw new BadRequestException(
        'Solo las fuentes API permiten prueba de conexion.',
      );
    }
    if (!source.urlBase?.trim()) {
      throw new BadRequestException('La fuente API no tiene URL base configurada.');
    }

    const config = (source.mapeoCampos ?? {}) as Record<string, unknown>;
    const endpointPath =
      typeof config.endpointPersonas === 'string' &&
      config.endpointPersonas.trim().length > 0
        ? config.endpointPersonas.trim()
        : '/personas';
    const endpoint = this.composeEndpoint(source.urlBase, endpointPath);
    const headers = this.buildAuthHeaders(
      source.metodoAutenticacion,
      source.secretoCifrado
        ? this.secretsService.decryptString(source.secretoCifrado)
        : undefined,
      source.usuarioTecnico,
      config,
    );

    const allowedHost = this.secureHttpClient.extractHostname(source.urlBase);
    const response = await this.secureHttpClient.request({
      url: endpoint,
      method: 'GET',
      headers,
      timeoutMs: 12000,
      allowedHosts: allowedHost ? [allowedHost] : undefined,
    });

    const records = response.jsonValid ? this.extractRecords(response.json) : [];

    return {
      ok: response.ok && response.jsonValid,
      httpStatus: response.status,
      responseTimeMs: response.responseTimeMs,
      endpoint: response.finalUrl,
      jsonValid: response.jsonValid,
      recordsFound: records.length,
      preview: records.slice(0, 10),
      jsonSample: response.jsonValid ? response.json : response.text.slice(0, 5000),
    };
  }

  private async actor(user: AuthenticatedUser) {
    if (
      !(await this.usuarios.findOne({
        where: {
          id: user.userId,
          empresaId: user.empresaId,
          estado: 'activo',
          deletedAt: IsNull(),
        },
      }))
    )
      throw new NotFoundException('Actor no disponible');
  }
  private async log(user: AuthenticatedUser, accion: string, id: string) {
    await this.bitacora.save(
      this.bitacora.create({
        empresaId: user.empresaId,
        usuarioActorId: user.userId,
        accion,
        entidad: 'fuentes_empleados',
        entidadId: id,
        resultado: 'exito',
      }),
    );
  }

  private sanitize(item: FuentesEmpleado) {
    const sanitizedMap = { ...(item.mapeoCampos ?? {}) } as Record<
      string,
      unknown
    >;
    if (typeof sanitizedMap.secretKey === 'string') {
      sanitizedMap.secretKey = '************';
    }
    if (typeof sanitizedMap.apiKey === 'string') {
      sanitizedMap.apiKey = '************';
    }
    if (typeof sanitizedMap.bearerToken === 'string') {
      sanitizedMap.bearerToken = '************';
    }
    if (typeof sanitizedMap.basicPassword === 'string') {
      sanitizedMap.basicPassword = '************';
    }
    if (typeof sanitizedMap.oauthClientSecret === 'string') {
      sanitizedMap.oauthClientSecret = '************';
    }

    return {
      ...item,
      secretoCifrado: undefined,
      secretoConfigurado: !!item.secretoCifrado,
      mapeoCampos: sanitizedMap,
    };
  }

  private normalizePayload(
    dto: Partial<CreateFuentesEmpleadoDto & UpdateFuentesEmpleadoDto>,
  ) {
    const next = { ...dto };
    if (next.metodoAutenticacion?.trim()) {
      next.metodoAutenticacion = next.metodoAutenticacion.trim().toLowerCase();
    }
    if (next.urlBase?.trim()) {
      next.urlBase = next.urlBase.trim();
    }
    if (next.usuarioTecnico?.trim()) {
      next.usuarioTecnico = next.usuarioTecnico.trim();
    }
    if (next.mapeoCampos && typeof next.mapeoCampos === 'object') {
      next.mapeoCampos = { ...next.mapeoCampos };
      this.validateMapping(next.tipoFuente, next.mapeoCampos);
      this.normalizeSecretsIntoEntity(next);
    }
    return next;
  }

  private validateMapping(tipoFuente: string | undefined, mapping: unknown) {
    if (!mapping || typeof mapping !== 'object') {
      throw new BadRequestException('mapeoCampos debe ser un objeto válido.');
    }
    if (tipoFuente === 'api_rest') {
      const m = mapping as Record<string, unknown>;
      const endpoint =
        typeof m.endpointPersonas === 'string' ? m.endpointPersonas.trim() : '';
      if (!endpoint) {
        throw new BadRequestException(
          'mapeoCampos.endpointPersonas es obligatorio para tipoFuente api_rest.',
        );
      }
    }
  }

  private versionedMapping(
    incoming: Record<string, unknown> | undefined,
    previous: Record<string, unknown> | null,
  ) {
    const next = { ...(incoming ?? {}) };
    const previousMeta =
      previous && typeof previous._meta === 'object'
        ? (previous._meta as Record<string, unknown>)
        : undefined;
    const previousVersion =
      typeof previousMeta?.version === 'number' && previousMeta.version > 0
        ? previousMeta.version
        : 0;
    const currentVersion = previous ? previousVersion + 1 : 1;

    next._meta = {
      version: currentVersion,
      updatedAt: new Date().toISOString(),
    };
    return next;
  }

  private normalizeSecretsIntoEntity(
    payload: Partial<CreateFuentesEmpleadoDto & UpdateFuentesEmpleadoDto>,
  ) {
    const map = payload.mapeoCampos as Record<string, unknown>;
    const tokenKeys = [
      'apiKey',
      'bearerToken',
      'basicPassword',
      'oauthClientSecret',
      'secretKey',
    ];
    const rawSecret = tokenKeys
      .map((key) => map[key])
      .find((value) => typeof value === 'string' && value.trim().length > 0) as
      | string
      | undefined;
    if (rawSecret && rawSecret !== '************') {
      payload.secretoCifrado = this.secretsService.encryptString(rawSecret);
    }
    tokenKeys.forEach((key) => {
      if (map[key] !== undefined) {
        map[key] = '************';
      }
    });
    payload.mapeoCampos = map;
  }

  private composeEndpoint(urlBase: string, path: string) {
    const base = urlBase.endsWith('/') ? urlBase.slice(0, -1) : urlBase;
    const route = path.startsWith('/') ? path : `/${path}`;
    return `${base}${route}`;
  }

  private buildAuthHeaders(
    method: string | undefined,
    secret: string | undefined,
    usuarioTecnico: string | undefined,
    config: Record<string, unknown>,
  ) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    const authMethod = (method ?? '').toLowerCase();
    if (!authMethod) return headers;

    if (authMethod === 'bearer' && secret) {
      headers.Authorization = `Bearer ${secret}`;
      return headers;
    }

    if (authMethod === 'api_key' && secret) {
      const headerName =
        typeof config.apiKeyHeaderName === 'string' &&
        config.apiKeyHeaderName.trim().length > 0
          ? config.apiKeyHeaderName.trim()
          : 'x-api-key';
      headers[headerName] = secret;
      return headers;
    }

    if (authMethod === 'basic' && secret) {
      const token = Buffer.from(`${usuarioTecnico ?? ''}:${secret}`).toString(
        'base64',
      );
      headers.Authorization = `Basic ${token}`;
      return headers;
    }

    return headers;
  }

  private extractRecords(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
      return payload.filter(
        (item) => !!item && typeof item === 'object',
      ) as Array<Record<string, unknown>>;
    }
    if (payload && typeof payload === 'object') {
      const data = payload as { items?: unknown; personas?: unknown };
      if (Array.isArray(data.items)) {
        return data.items.filter(
          (item) => !!item && typeof item === 'object',
        ) as Array<Record<string, unknown>>;
      }
      if (Array.isArray(data.personas)) {
        return data.personas.filter(
          (item) => !!item && typeof item === 'object',
        ) as Array<Record<string, unknown>>;
      }
    }
    return [];
  }
}
