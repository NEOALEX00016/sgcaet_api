import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as nodemailer from 'nodemailer';
import { Repository } from 'typeorm';
import { IntegracionMesaAyuda } from './entities/integracion-mesa-ayuda.entity';
import { EventoIntegracionMesaAyuda } from './entities/evento-integracion-mesa-ayuda.entity';
import { Solicitud } from '../solicitudes/entities/solicitud.entity';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { CreateIntegracionMesaAyudaDto } from './dto/create-integracion-mesa-ayuda.dto';
import { UpdateIntegracionMesaAyudaDto } from './dto/update-integracion-mesa-ayuda.dto';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { SecretsService } from '../common/security/secrets.service';
import { ConfiguracionOperativaTenantService } from '../configuracion-operativa-tenant/configuracion-operativa-tenant.service';
import { BitacoraAuditoriaSistema } from '../bitacora-auditoria-sistema/entities/bitacora-auditoria-sistema.entity';

const SENSITIVE_HEADER_KEYS = new Set([
  'authorization',
  'x-api-key',
  'api-key',
]);

@Injectable()
export class IntegracionesMesaAyudaService {
  private readonly logger = new Logger(IntegracionesMesaAyudaService.name);

  constructor(
    @InjectRepository(IntegracionMesaAyuda)
    private readonly integracionesRepository: Repository<IntegracionMesaAyuda>,
    @InjectRepository(EventoIntegracionMesaAyuda)
    private readonly eventosRepository: Repository<EventoIntegracionMesaAyuda>,
    @InjectRepository(Solicitud)
    private readonly solicitudesRepository: Repository<Solicitud>,
    @InjectRepository(BitacoraAuditoriaSistema)
    private readonly bitacoraRepository: Repository<BitacoraAuditoriaSistema>,
    private readonly secureHttpClient: SecureHttpClientService,
    private readonly secretsService: SecretsService,
    private readonly configuracionTenantService: ConfiguracionOperativaTenantService,
  ) {}

  async create(
    dto: CreateIntegracionMesaAyudaDto,
    user: AuthenticatedUser,
  ): Promise<IntegracionMesaAyuda> {
    const prepared = this.prepareIntegrationPayload(dto);
    const saved = await this.integracionesRepository.save(
      this.integracionesRepository.create({
        ...prepared,
        empresaId: user.empresaId,
      }),
    );
    return this.sanitizeIntegration(saved);
  }

  async findAll(empresaId: string): Promise<IntegracionMesaAyuda[]> {
    const items = await this.integracionesRepository.find({
      where: { empresaId },
      order: { createdAt: 'DESC' },
    });
    return items.map((item) => this.sanitizeIntegration(item));
  }

  async findOne(id: string, empresaId: string): Promise<IntegracionMesaAyuda> {
    const item = await this.integracionesRepository.findOne({
      where: { id, empresaId },
    });
    if (!item) throw new NotFoundException('Integración no encontrada');
    return this.sanitizeIntegration(item);
  }

  async update(
    id: string,
    dto: UpdateIntegracionMesaAyudaDto,
    empresaId: string,
  ): Promise<IntegracionMesaAyuda> {
    const item = await this.integracionesRepository
      .createQueryBuilder('integracion')
      .addSelect('integracion.authConfigCifrada')
      .where('integracion.id = :id', { id })
      .andWhere('integracion.empresa_id = :empresaId', { empresaId })
      .getOne();
    if (!item) throw new NotFoundException('Integración no encontrada');

    const prepared = this.prepareIntegrationPayload(dto, item.authConfigCifrada);
    if (dto.activo === true) {
      await this.validateBeforeActivation(
        this.integracionesRepository.merge(item, prepared),
      );
    }
    return this.sanitizeIntegration(
      await this.integracionesRepository.save(
        this.integracionesRepository.merge(item, prepared),
      ),
    );
  }

  async remove(id: string, empresaId: string): Promise<void> {
    await this.findOne(id, empresaId);
    await this.integracionesRepository.delete({ id, empresaId });
  }

  findEvents(empresaId: string): Promise<EventoIntegracionMesaAyuda[]> {
    return this.eventosRepository.find({
      where: { empresaId },
      order: { createdAt: 'DESC' },
    });
  }

  async probarIntegracion(id: string, user: AuthenticatedUser) {
    const integracion = await this.integracionesRepository
      .createQueryBuilder('integracion')
      .addSelect('integracion.authConfigCifrada')
      .where('integracion.id = :id', { id })
      .andWhere('integracion.empresa_id = :empresaId', { empresaId: user.empresaId })
      .getOne();

    if (!integracion) {
      throw new NotFoundException('Integración no encontrada');
    }

    const started = Date.now();
    try {
      let result: Record<string, unknown>;
      if (integracion.tipo === 'api') {
        result = await this.probarCanalApi(integracion);
      } else {
        result = await this.probarCanalEmail(integracion, user.empresaId);
      }

      await this.persistIntegrationProbe(integracion, user.userId, true, result.detail as string);
      return {
        ok: true,
        responseTimeMs: Date.now() - started,
        detail: (result.detail as string) || 'Prueba de integración completada.',
      };
    } catch (error) {
      const detail =
        error instanceof Error
          ? error.message
          : 'Error durante prueba de integración';
      await this.persistIntegrationProbe(integracion, user.userId, false, detail);
      return {
        ok: false,
        responseTimeMs: Date.now() - started,
        detail,
      };
    }
  }

  private sanitizeIntegration(
    integration: IntegracionMesaAyuda,
  ): IntegracionMesaAyuda {
    const { authConfigCifrada: _authConfigCifrada, ...safe } = integration;
    if (safe.headersJson) {
      safe.headersJson = this.redactHeaders(safe.headersJson);
    }
    return safe;
  }

  async dispatchForSolicitud(solicitud: Solicitud): Promise<void> {
    const integraciones = await this.integracionesRepository
      .createQueryBuilder('integracion')
      .addSelect('integracion.authConfigCifrada')
      .where('integracion.empresa_id = :empresaId', { empresaId: solicitud.empresaId })
      .andWhere('integracion.activo = true')
      .getMany();
    for (const integracion of integraciones) {
      const idempotencyKey = this.buildDispatchIdempotencyKey(
        solicitud,
        integracion.id,
      );
      const existente = await this.eventosRepository.findOne({
        where: {
          empresaId: solicitud.empresaId,
          solicitudId: solicitud.id,
          integracionId: integracion.id,
          idempotencyKey,
        },
      });

      if (existente && existente.estado === 'enviado') {
        continue;
      }

      const evento = existente
        ? existente
        : await this.eventosRepository.save(
            this.eventosRepository.create({
              empresaId: solicitud.empresaId,
              solicitudId: solicitud.id,
              integracionId: integracion.id,
              idempotencyKey,
              estado: 'pendiente',
              referenciaExterna: solicitud.referenciaExterna,
            }),
          );
      try {
        const result =
          integracion.tipo === 'api'
            ? await this.sendApi(integracion, solicitud)
            : await this.sendEmail(integracion, solicitud);
        evento.estado = 'enviado';
        evento.enviadoEn = new Date();
        evento.intentos = 1;
        evento.respuestaExterna = result;
      } catch (error) {
        evento.estado = 'error';
        evento.intentos = 1;
        evento.ultimoError =
          error instanceof Error ? error.message : 'Error de integración';
        this.logger.error(
          `No se pudo enviar solicitud ${solicitud.id} a integración ${integracion.id}`,
        );
      }
      await this.eventosRepository.save(evento);
    }
  }

  async retryEventById(eventId: string, user: AuthenticatedUser) {
    const event = await this.eventosRepository.findOne({
      where: {
        id: eventId,
        empresaId: user.empresaId,
      },
    });
    if (!event) {
      throw new NotFoundException('Evento de integracion no encontrado');
    }
    if (event.estado !== 'error') {
      throw new BadRequestException(
        'Solo se permite retry manual de eventos en estado error',
      );
    }

    const integracion = await this.integracionesRepository
      .createQueryBuilder('integracion')
      .addSelect('integracion.authConfigCifrada')
      .where('integracion.id = :id', { id: event.integracionId })
      .andWhere('integracion.empresa_id = :empresaId', { empresaId: user.empresaId })
      .getOne();
    if (!integracion || !integracion.activo) {
      throw new NotFoundException('Integración activa no encontrada para el evento');
    }

    const solicitud = await this.solicitudesRepository.findOne({
      where: {
        id: event.solicitudId,
        empresaId: user.empresaId,
      },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada para el evento');
    }

    const before = {
      estado: event.estado,
      intentos: event.intentos,
      ultimoError: event.ultimoError,
      siguienteIntentoEn: event.siguienteIntentoEn,
      enviadoEn: event.enviadoEn,
    };

    try {
      const result =
        integracion.tipo === 'api'
          ? await this.sendApi(integracion, solicitud)
          : await this.sendEmail(integracion, solicitud);
      event.estado = 'enviado';
      event.enviadoEn = new Date();
      event.intentos = (event.intentos ?? 0) + 1;
      event.respuestaExterna = result;
      event.ultimoError = undefined;
      event.siguienteIntentoEn = undefined;
    } catch (error) {
      event.estado = 'error';
      event.intentos = (event.intentos ?? 0) + 1;
      event.ultimoError =
        error instanceof Error ? error.message : 'Error de integración';
      event.siguienteIntentoEn = new Date(Date.now() + 60 * 1000);
    }

    const saved = await this.eventosRepository.save(event);
    await this.registrarBitacoraRetry(user, saved, before);

    return {
      ok: true,
      id: saved.id,
      estado: saved.estado,
      intentos: saved.intentos,
      ultimoError: saved.ultimoError,
    };
  }

  private buildDispatchIdempotencyKey(
    solicitud: Solicitud,
    integracionId: string,
  ): string {
    return `solicitud:${solicitud.id}:integracion:${integracionId}:dispatch:v1`;
  }

  private async sendApi(
    integracion: IntegracionMesaAyuda,
    solicitud: Solicitud,
  ): Promise<Record<string, unknown>> {
    if (!integracion.endpointSolicitud && !integracion.baseUrl)
      throw new Error('Integración API sin endpoint');
    const url = `${integracion.baseUrl ?? ''}${integracion.endpointSolicitud ?? ''}`;
    const allowedHost = this.secureHttpClient.extractHostname(integracion.baseUrl);
    const response = await this.secureHttpClient.request({
      url,
      method: 'POST',
      headers: this.buildApiHeaders(integracion),
      body: JSON.stringify({
        externalId: solicitud.id,
        type: solicitud.tipoSolicitud,
        resource: solicitud.recursoTipo,
        quantity: solicitud.cantidad,
        unit: solicitud.unidad,
        from: solicitud.desdeEn,
        to: solicitud.hastaEn,
        reason: solicitud.motivo,
      }),
      timeoutMs: 12000,
      allowedHosts: allowedHost ? [allowedHost] : undefined,
    });
    if (!response.ok)
      throw new Error(`Mesa de ayuda respondió HTTP ${response.status}`);
    return (response.jsonValid && response.json && typeof response.json === 'object'
      ? response.json
      : {}) as Record<string, unknown>;
  }

  private async sendEmail(
    integracion: IntegracionMesaAyuda,
    solicitud: Solicitud,
  ): Promise<Record<string, unknown>> {
    if (!integracion.emailDestino)
      throw new Error('Integración email sin destinatario');

    const tenantSmtp =
      await this.configuracionTenantService.getCorreoDeliveryConfig(
        solicitud.empresaId,
      );

    if (tenantSmtp.mode !== 'smtp') {
      throw new Error(
        'Integracion email requiere proveedor SMTP por compatibilidad de transporte.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: tenantSmtp.host,
      port: tenantSmtp.port,
      secure: !tenantSmtp.tls || tenantSmtp.port === 465,
      auth: { user: tenantSmtp.user, pass: tenantSmtp.pass },
    });
    await transporter.sendMail({
      from: tenantSmtp.from,
      to: integracion.emailDestino,
      subject: `[SGCAET] Nueva solicitud ${solicitud.id}`,
      text: `Solicitud ${solicitud.tipoSolicitud}: ${solicitud.recursoTipo}\nCantidad: ${solicitud.cantidad ?? ''} ${solicitud.unidad ?? ''}\nMotivo: ${solicitud.motivo ?? ''}`,
    });
    return { delivered: true };
  }

  private async validateBeforeActivation(
    integracion: IntegracionMesaAyuda,
  ): Promise<void> {
    if (integracion.tipo === 'api') {
      if (!integracion.baseUrl || !integracion.endpointSolicitud) {
        throw new Error(
          'Para activar integracion API se requiere baseUrl y endpointSolicitud.',
        );
      }
      const host = this.secureHttpClient.extractHostname(integracion.baseUrl);
      if (!host) {
        throw new Error('baseUrl invalido para activacion de integracion API.');
      }
      return;
    }

    if (!integracion.emailDestino) {
      throw new Error(
        'Para activar integracion email se requiere emailDestino.',
      );
    }

    const correoConfig =
      await this.configuracionTenantService.getCorreoDeliveryConfig(
        integracion.empresaId,
      );
    if (correoConfig.mode !== 'smtp') {
      throw new Error(
        'Integracion email requiere proveedor SMTP configurado en el tenant.',
      );
    }
  }

  private async probarCanalApi(
    integracion: IntegracionMesaAyuda,
  ): Promise<Record<string, unknown>> {
    if (!integracion.baseUrl || !integracion.endpointSolicitud) {
      throw new Error(
        'Integración API incompleta para prueba (baseUrl/endpointSolicitud).',
      );
    }

    const url = `${integracion.baseUrl}${integracion.endpointSolicitud}`;
    const allowedHost = this.secureHttpClient.extractHostname(integracion.baseUrl);
    const response = await this.secureHttpClient.request({
      url,
      method: 'POST',
      headers: this.buildApiHeaders(integracion),
      body: JSON.stringify({
        type: 'probe',
        source: 'sgcaet-configuracion',
        timestamp: new Date().toISOString(),
      }),
      timeoutMs: 12000,
      allowedHosts: allowedHost ? [allowedHost] : undefined,
    });

    if (!response.ok) {
      throw new Error(`Prueba API devolvió HTTP ${response.status}`);
    }

    return { detail: 'Prueba API completada correctamente.' };
  }

  private async probarCanalEmail(
    integracion: IntegracionMesaAyuda,
    empresaId: string,
  ): Promise<Record<string, unknown>> {
    if (!integracion.emailDestino) {
      throw new Error('Integración email sin destinatario para prueba.');
    }

    const tenantSmtp =
      await this.configuracionTenantService.getCorreoDeliveryConfig(empresaId);

    if (tenantSmtp.mode !== 'smtp') {
      throw new Error(
        'Proveedor de correo del tenant no es SMTP para prueba de integración email.',
      );
    }

    const transporter = nodemailer.createTransport({
      host: tenantSmtp.host,
      port: tenantSmtp.port,
      secure: !tenantSmtp.tls || tenantSmtp.port === 465,
      auth: { user: tenantSmtp.user, pass: tenantSmtp.pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from: tenantSmtp.from,
      to: integracion.emailDestino,
      subject: '[SGCAET] Prueba de integración',
      text: 'Mensaje de prueba generado desde Configuración tenant.',
    });

    return { detail: 'Prueba email completada correctamente.' };
  }

  private async persistIntegrationProbe(
    integracion: IntegracionMesaAyuda,
    actorId: string,
    ok: boolean,
    detail: string,
  ) {
    integracion.ultimaPruebaAt = new Date();
    integracion.ultimaPruebaEstado = ok ? 'ok' : 'error';
    integracion.ultimaPruebaDetalle = detail;
    integracion.ultimaPruebaActorId = actorId;
    await this.integracionesRepository.save(integracion);
  }

  private async registrarBitacoraRetry(
    user: AuthenticatedUser,
    event: EventoIntegracionMesaAyuda,
    before: Record<string, unknown>,
  ) {
    const registro = this.bitacoraRepository.create({
      empresaId: user.empresaId,
      usuarioActorId: user.userId,
      accion: 'INTEGRACION_EVENTO_RETRY_MANUAL',
      entidad: 'eventos_integracion_mesa_ayuda',
      entidadId: event.id,
      valoresAnteriores: before,
      valoresNuevos: {
        estado: event.estado,
        intentos: event.intentos,
        ultimoError: event.ultimoError,
        siguienteIntentoEn: event.siguienteIntentoEn,
        enviadoEn: event.enviadoEn,
      },
      resultado: 'exito',
    });
    await this.bitacoraRepository.save(registro);
  }

  private prepareIntegrationPayload(
    dto: Partial<CreateIntegracionMesaAyudaDto & UpdateIntegracionMesaAyudaDto>,
    existingEncrypted?: string,
  ): Partial<IntegracionMesaAyuda> {
    const next: Partial<IntegracionMesaAyuda> = { ...dto };
    const currentAuth = this.readAuthConfig(existingEncrypted);

    if (dto.headersJson && typeof dto.headersJson === 'object') {
      const { publicHeaders, secretHeaders } = this.splitHeaders(dto.headersJson);
      next.headersJson = publicHeaders;
      if (Object.keys(secretHeaders).length > 0) {
        currentAuth.headers = {
          ...(currentAuth.headers ?? {}),
          ...secretHeaders,
        };
      }
    }

    if (dto.authTipo?.trim()) {
      currentAuth.authTipo = dto.authTipo.trim();
    }

    if (Object.keys(currentAuth).length > 0) {
      next.authConfigCifrada = this.secretsService.encryptString(
        JSON.stringify(currentAuth),
      );
    }

    return next;
  }

  private splitHeaders(headers: Record<string, string>) {
    const publicHeaders: Record<string, string> = {};
    const secretHeaders: Record<string, string> = {};

    Object.entries(headers).forEach(([key, value]) => {
      const normalized = key.trim().toLowerCase();
      if (SENSITIVE_HEADER_KEYS.has(normalized)) {
        if (typeof value === 'string' && value.trim().length > 0 && value !== '************') {
          secretHeaders[key] = value;
        }
        return;
      }
      publicHeaders[key] = value;
    });

    return { publicHeaders, secretHeaders };
  }

  private readAuthConfig(encrypted?: string): { authTipo?: string; headers?: Record<string, string> } {
    if (!encrypted) return {};
    try {
      const raw = this.secretsService.decryptString(encrypted);
      const parsed = JSON.parse(raw) as { authTipo?: string; headers?: Record<string, string> };
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private buildApiHeaders(integracion: IntegracionMesaAyuda): Record<string, string> {
    const auth = this.readAuthConfig(integracion.authConfigCifrada);
    return {
      'Content-Type': 'application/json',
      ...(integracion.headersJson ?? {}),
      ...(auth.headers ?? {}),
    };
  }

  private redactHeaders(headers: Record<string, string>): Record<string, string> {
    const next: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      const normalized = key.trim().toLowerCase();
      next[key] = SENSITIVE_HEADER_KEYS.has(normalized) ? '************' : value;
    });
    return next;
  }
}
