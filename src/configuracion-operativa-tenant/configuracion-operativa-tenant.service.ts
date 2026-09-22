import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { promises as fs } from 'fs';
import * as nodemailer from 'nodemailer';
import { join, resolve } from 'path';
import { Repository } from 'typeorm';
import { ConfiguracionOperativaTenant } from './entities/configuracion-operativa-tenant.entity';
import { UpdateConfiguracionOperativaTenantDto } from './dto/update-configuracion-operativa-tenant.dto';
import { SecretsService } from '../common/security/secrets.service';
import { SecureHttpClientService } from '../common/http/secure-http-client.service';
import { LicenciaEmpresa } from '../licencias-empresa/entities/licencias-empresa.entity';
import { LicenciaFirmaService } from '../licencias-empresa/licencia-firma.service';
import { createHash, timingSafeEqual } from 'crypto';

const defaults = {
  remitenteNombre: 'SGCAET',
  remitenteCorreo: 'notificaciones@tenant.local',
  smtpTls: true,
  correoProveedor: 'smtp' as const,
  correoApiAuthHeader: 'Authorization',
  correoApiAuthPrefix: 'Bearer',
  almacenamientoModo: 'local' as const,
  almacenamientoRutaLocal: 'storage/evidencias',
  almacenamientoNubeSsl: true,
  autoProvisionRepositorioNube: false,
};

const AUTHORIZED_CLOUD_STORAGE_PROVIDERS = new Set([
  's3',
  'minio',
  'compatible',
]);

@Injectable()
export class ConfiguracionOperativaTenantService {
  constructor(
    @InjectRepository(ConfiguracionOperativaTenant)
    private readonly repository: Repository<ConfiguracionOperativaTenant>,
    private readonly secretsService: SecretsService,
    private readonly secureHttpClient: SecureHttpClientService,
    @InjectRepository(LicenciaEmpresa)
    private readonly licenciasRepository: Repository<LicenciaEmpresa>,
    private readonly licenciaFirmaService: LicenciaFirmaService,
  ) {}

  async get(empresaId: string): Promise<ConfiguracionOperativaTenant> {
    const current = await this.repository.findOne({ where: { empresaId } });
    if (current) return this.sanitize(current);
    return this.sanitize(this.repository.create({ empresaId, ...defaults }));
  }

  getInstallationMode() {
    const mode = process.env.SGCAET_INSTALLATION_MODE === 'local' ? 'local' : 'cloud';
    return { installationMode: mode, manualConfigurationAllowed: mode === 'local' };
  }

  async update(
    empresaId: string,
    dto: UpdateConfiguracionOperativaTenantDto,
  ): Promise<ConfiguracionOperativaTenant> {
    const current = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.smtpContrasenaCifrada')
      .addSelect('cfg.almacenamientoNubeSecretCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();
    const next = this.normalizeSensitive(dto);
    const merged = current
      ? this.repository.merge(current, next)
      : this.repository.create({ empresaId, ...defaults, ...next });

    this.validarReglas(merged);
    const saved = await this.repository.save(merged);
    return this.sanitize(saved);
  }

  async validarConexionPlataforma(empresaId: string) {
    if (this.getInstallationMode().installationMode === 'cloud') {
      const licencia = await this.licenciasRepository.findOne({
        where: { empresaId },
        order: { venceEn: 'DESC' },
      });
      if (!licencia) {
        if (!this.licenciaFirmaService.enforcementEnabled()) {
          return {
            ok: true,
            estado: 'desarrollo',
            tipoLicencia: 'desarrollo',
            esPerpetua: false,
            detalle: 'Validacion omitida en desarrollo: no hay licencia firmada local.',
          };
        }
        throw new BadRequestException('No existe una licencia asignada a este tenant en la plataforma.');
      }
      const verified = this.licenciaFirmaService.validar(licencia);
      if (!verified && this.licenciaFirmaService.enforcementEnabled()) {
        throw new BadRequestException('La licencia del tenant no tiene una firma válida de la plataforma.');
      }
      const result = {
        ok: verified || !this.licenciaFirmaService.enforcementEnabled(),
        estado: licencia.estado,
        tipoLicencia: licencia.tipoLicencia,
        venceEn: licencia.venceEn,
        esPerpetua: licencia.tipoLicencia === 'perpetua',
        detalle: verified
          ? 'Licencia cloud validada correctamente.'
          : 'Licencia local sin firma; enforcement desactivado en desarrollo.',
      };
      await this.repository.update({ empresaId }, {
        cloudUltimaValidacionAt: new Date(),
        cloudUltimaValidacionEstado: result.ok ? 'ok' : 'error',
        cloudUltimaValidacionDetalle: result.detalle,
        cloudLicenciaTipo: result.tipoLicencia,
        cloudLicenciaEstado: result.estado,
        cloudLicenciaVenceEn: result.esPerpetua ? undefined : result.venceEn,
        cloudLicenciaEsPerpetua: result.esPerpetua,
      });
      return result;
    }
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.cloudApiKeyCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();
    if (!config?.cloudApiUrl || !config.cloudTenantId || !config.cloudApiKeyCifrada) {
      throw new BadRequestException('Falta configurar tenant ID, URL de plataforma y API key.');
    }
    const apiKey = this.secretsService.decryptString(config.cloudApiKeyCifrada);
    const base = config.cloudApiUrl.endsWith('/') ? config.cloudApiUrl.slice(0, -1) : config.cloudApiUrl;
    const path = config.cloudLicensePath || '/v1/licenses/validate';
    const endpoint = `${base}${path.startsWith('/') ? path : `/${path}`}`;
    const host = this.secureHttpClient.extractHostname(config.cloudApiUrl);
    const response = await this.secureHttpClient.request({
      url: endpoint,
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}`, 'X-Tenant-Id': config.cloudTenantId },
      body: JSON.stringify({ tenantId: config.cloudTenantId }),
      allowedHosts: host ? [host] : undefined,
    });
    if (!response.ok || !response.jsonValid) {
      throw new BadRequestException('La plataforma no pudo validar la licencia del tenant.');
    }
    const payload = response.json as Record<string, unknown>;
    const signed = typeof payload.payloadFirmado === 'string' ? payload.payloadFirmado : undefined;
    const signature = typeof payload.firmaLicencia === 'string' ? payload.firmaLicencia : undefined;
    if (!signed || !signature) throw new BadRequestException('Respuesta de licencia sin firma válida.');
    const licencia = await this.licenciasRepository.findOne({ where: { empresaId }, order: { venceEn: 'DESC' } });
    if (!licencia) throw new BadRequestException('No existe licencia local para sincronizar.');
    licencia.payloadFirmado = signed;
    licencia.firmaLicencia = signature;
    await this.licenciasRepository.save(licencia);
    return { ok: true, estado: payload.estado ?? licencia.estado, venceEn: payload.venceEn ?? licencia.venceEn, detalle: 'Licencia validada y sincronizada.' };
  }

  async validarLicenciaMachine(tenantId?: string, apiKey?: string) {
    if (!tenantId?.trim() || !apiKey?.trim()) {
      throw new BadRequestException('Tenant ID y API key son obligatorios.');
    }
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.cloudApiKeyCifrada')
      .where('cfg.cloudTenantId = :tenantId', { tenantId: tenantId.trim() })
      .getOne();
    if (!config?.cloudApiKeyCifrada) {
      throw new BadRequestException('Tenant no configurado para validacion machine-to-machine.');
    }
    const expected = this.secretsService.decryptString(config.cloudApiKeyCifrada);
    const actualHash = createHash('sha256').update(apiKey.trim()).digest();
    const expectedHash = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(actualHash, expectedHash)) {
      throw new BadRequestException('Credencial de plataforma invalida.');
    }
    const licencia = await this.licenciasRepository.findOne({
      where: { empresaId: config.empresaId },
      order: { venceEn: 'DESC' },
    });
    if (!licencia) throw new BadRequestException('Tenant sin licencia registrada.');
    const payloadFirmado = this.licenciaFirmaService.crearPayload(licencia);
    const firmaLicencia = this.licenciaFirmaService.firmar(payloadFirmado);
    licencia.payloadFirmado = payloadFirmado;
    licencia.firmaLicencia = firmaLicencia;
    await this.licenciasRepository.save(licencia);
    return {
      ok: true,
      tenantId: tenantId.trim(),
      payloadFirmado,
      firmaLicencia,
      estado: licencia.estado,
      tipoLicencia: licencia.tipoLicencia,
      venceEn: licencia.venceEn,
      detalle: 'Licencia validada mediante conexion machine-to-machine.',
    };
  }

  async probarCorreo(empresaId: string, actorId: string) {
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.smtpContrasenaCifrada')
      .addSelect('cfg.correoApiKeyCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();
    if (!config) {
      throw new BadRequestException('No existe configuracion del tenant.');
    }
    const started = Date.now();
    if ((config.correoProveedor ?? 'smtp') === 'smtp') {
      const smtp = await this.getCorreoDeliveryConfig(empresaId);
      if (smtp.mode !== 'smtp') {
        throw new BadRequestException('Proveedor SMTP no disponible.');
      }

      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: !smtp.tls || smtp.port === 465,
        auth: { user: smtp.user, pass: smtp.pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });

      try {
        await transporter.verify();
      } catch (error) {
        const result = {
          ok: false,
          provider: smtp.host,
          responseTimeMs: Date.now() - started,
          detail:
            error instanceof Error
              ? `Fallo validacion SMTP: ${error.message}`
              : 'Fallo validacion SMTP',
        };
        await this.persistCorreoProbeResult(config, actorId, result);
        return result;
      }

      const result = {
        ok: true,
        provider: smtp.host,
        responseTimeMs: Date.now() - started,
        detail: 'Conexion SMTP validada correctamente.',
      };
      await this.persistCorreoProbeResult(config, actorId, result);
      return result;
    }

    const probe = await this.getCorreoApiDeliveryConfig(empresaId);
    const allowedHost = this.secureHttpClient.extractHostname(probe.endpoint);
    if (!allowedHost) {
      throw new BadRequestException('Endpoint de correo API invalido para prueba.');
    }
    const response = await this.secureHttpClient.request({
      url: probe.endpoint,
      method: 'POST',
      headers: this.buildCorreoApiHeaders(probe),
      body: JSON.stringify({
        from: config.remitenteCorreo,
        to: config.remitenteCorreo,
        subject: 'SGCAET correo probe',
        text: 'probe',
      }),
      timeoutMs: 10000,
      allowedHosts: [allowedHost],
    });

    const result = {
      ok: response.ok,
      provider: config.correoProveedor,
      responseTimeMs: Date.now() - started,
      detail: response.ok
        ? 'Configuracion API key valida para pruebas de envio.'
        : `Proveedor API respondió HTTP ${response.status}`,
      httpStatus: response.status,
      endpoint: probe.endpoint,
    };
    await this.persistCorreoProbeResult(config, actorId, result);
    return result;
  }

  async getCorreoDeliveryConfig(empresaId: string) {
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.smtpContrasenaCifrada')
      .addSelect('cfg.correoApiKeyCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();
    if (!config) {
      throw new BadRequestException('No existe configuracion del tenant.');
    }

    if ((config.correoProveedor ?? 'smtp') !== 'smtp') {
      return this.getCorreoApiDeliveryConfig(empresaId);
    }

    if (
      !config.smtpHost ||
      !config.smtpPuerto ||
      !config.smtpUsuario ||
      !config.smtpContrasenaCifrada
    ) {
      throw new BadRequestException('SMTP no configurado para el tenant.');
    }

    return {
      mode: 'smtp' as const,
      host: config.smtpHost,
      port: config.smtpPuerto,
      user: config.smtpUsuario,
      pass: this.secretsService.decryptString(config.smtpContrasenaCifrada),
      from: config.remitenteCorreo || config.smtpUsuario,
      tls: config.smtpTls !== false,
    };
  }

  async getCorreoApiDeliveryConfig(empresaId: string) {
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.correoApiKeyCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();

    if (!config) {
      throw new BadRequestException('No existe configuracion del tenant.');
    }

    const proveedor = config.correoProveedor ?? 'smtp';
    if (proveedor === 'smtp') {
      throw new BadRequestException('Proveedor de correo API no configurado.');
    }

    const endpoint =
      proveedor === 'resend'
        ? 'https://api.resend.com/emails'
        : proveedor === 'sendgrid_api'
          ? 'https://api.sendgrid.com/v3/mail/send'
          : config.correoApiEndpoint;

    if (!endpoint || !config.correoApiKeyCifrada) {
      throw new BadRequestException('Proveedor API key de correo incompleto.');
    }

    return {
      mode: 'api_key' as const,
      provider: proveedor,
      endpoint,
      authHeader: config.correoApiAuthHeader || 'Authorization',
      authPrefix: config.correoApiAuthPrefix || 'Bearer',
      apiKey: this.secretsService.decryptString(config.correoApiKeyCifrada),
      from: config.remitenteCorreo,
    };
  }

  async probarAlmacenamiento(empresaId: string, actorId: string) {
    const config = await this.repository
      .createQueryBuilder('cfg')
      .addSelect('cfg.almacenamientoNubeSecretCifrada')
      .where('cfg.empresa_id = :empresaId', { empresaId })
      .getOne();
    if (!config) {
      throw new BadRequestException('No existe configuracion del tenant.');
    }
    const started = Date.now();
    if (config.almacenamientoModo === 'local') {
      const result = await this.probeLocalStorage(config, started);
      await this.persistStorageProbeResult(config, actorId, result);
      return result;
    }

    const ok =
      !!config.almacenamientoNubeProveedor &&
      !!config.almacenamientoNubeRepositorio &&
      !!config.almacenamientoNubeAccessKey &&
      !!config.almacenamientoNubeSecretCifrada &&
      AUTHORIZED_CLOUD_STORAGE_PROVIDERS.has(config.almacenamientoNubeProveedor);
    const result = {
      ok,
      mode: config.almacenamientoNubeProveedor || 'nube-no-configurada',
      responseTimeMs: Date.now() - started,
      detail: ok
        ? 'Configuracion de almacenamiento en nube completa para pruebas.'
        : AUTHORIZED_CLOUD_STORAGE_PROVIDERS.has(
              config.almacenamientoNubeProveedor ?? '',
            )
          ? 'Faltan endpoint/bucket/access key/secret para almacenamiento en nube.'
          : `Proveedor ${config.almacenamientoNubeProveedor ?? 'desconocido'} no autorizado en este despliegue.`,
    };
    await this.persistStorageProbeResult(config, actorId, result);
    return result;
  }

  private validarReglas(payload: ConfiguracionOperativaTenant): void {
    if ((payload.correoProveedor ?? 'smtp') !== 'smtp') {
      if (!payload.remitenteCorreo?.trim()) {
        throw new BadRequestException('remitenteCorreo es obligatorio para proveedor API key de correo');
      }
      if (!payload.correoApiKeyCifrada) {
        throw new BadRequestException('correoApiKey es obligatorio para proveedor API key de correo');
      }
      if ((payload.correoProveedor ?? 'smtp') === 'custom_api' && !payload.correoApiEndpoint?.trim()) {
        throw new BadRequestException('correoApiEndpoint es obligatorio cuando correoProveedor=custom_api');
      }
      payload.smtpHost = undefined;
      payload.smtpPuerto = undefined;
      payload.smtpUsuario = undefined;
      payload.smtpContrasenaCifrada = undefined;
    }

    if ((payload.correoProveedor ?? 'smtp') === 'smtp') {
      payload.correoApiEndpoint = undefined;
      payload.correoApiAuthHeader = undefined;
      payload.correoApiAuthPrefix = undefined;
      payload.correoApiKeyCifrada = undefined;
    }

    if (payload.almacenamientoModo === 'local') {
      if (!payload.almacenamientoRutaLocal?.trim()) {
        throw new BadRequestException(
          'almacenamientoRutaLocal es obligatorio cuando almacenamientoModo=local',
        );
      }
      payload.almacenamientoNubeProveedor = undefined;
      payload.almacenamientoNubeRepositorio = undefined;
    } else {
      if (
        !payload.almacenamientoNubeProveedor ||
        !payload.almacenamientoNubeRepositorio?.trim()
      ) {
        throw new BadRequestException(
          'almacenamientoNubeProveedor y almacenamientoNubeRepositorio son obligatorios cuando almacenamientoModo=nube',
        );
      }
      if (
        !AUTHORIZED_CLOUD_STORAGE_PROVIDERS.has(payload.almacenamientoNubeProveedor)
      ) {
        throw new BadRequestException(
          `Proveedor ${payload.almacenamientoNubeProveedor} no autorizado en este despliegue.`,
        );
      }
      payload.almacenamientoRutaLocal = undefined;
    }

    this.validarOidcProvider(payload, 'microsoft');
    this.validarOidcProvider(payload, 'google');
  }

  private validarOidcProvider(
    payload: ConfiguracionOperativaTenant,
    provider: 'microsoft' | 'google',
  ): void {
    const isMicrosoft = provider === 'microsoft';
    const habilitado = isMicrosoft
      ? payload.oidcMicrosoftHabilitado
      : payload.oidcGoogleHabilitado;
    const issuer = (isMicrosoft
      ? payload.oidcMicrosoftIssuer
      : payload.oidcGoogleIssuer
    )?.trim();
    const audience = (isMicrosoft
      ? payload.oidcMicrosoftAudience
      : payload.oidcGoogleAudience
    )?.trim();
    const jwksUri = (isMicrosoft
      ? payload.oidcMicrosoftJwksUri
      : payload.oidcGoogleJwksUri
    )?.trim();
    const metadataUrl = (isMicrosoft
      ? payload.oidcMicrosoftMetadataUrl
      : payload.oidcGoogleMetadataUrl
    )?.trim();
    const clientId = (isMicrosoft
      ? payload.oidcMicrosoftClientId
      : payload.oidcGoogleClientId
    )?.trim();
    const clientSecret = (isMicrosoft
      ? payload.oidcMicrosoftClientSecretCifrada
      : payload.oidcGoogleClientSecretCifrada
    )?.trim();
    const redirectUri = (isMicrosoft
      ? payload.oidcMicrosoftRedirectUri
      : payload.oidcGoogleRedirectUri
    )?.trim();

    if (!habilitado) {
      return;
    }

    if (
      !issuer ||
      !audience ||
      (!jwksUri && !metadataUrl) ||
      !clientId ||
      !clientSecret ||
      !redirectUri
    ) {
      throw new BadRequestException(
        `OIDC ${provider} habilitado requiere clientId, clientSecret, redirectUri, issuer, audience y jwksUri o metadataUrl`,
      );
    }
  }

  private normalizeSensitive(dto: UpdateConfiguracionOperativaTenantDto) {
    const next = { ...dto } as UpdateConfiguracionOperativaTenantDto & {
      smtpContrasenaCifrada?: string;
      correoApiKeyCifrada?: string;
      almacenamientoNubeSecretCifrada?: string;
      oidcMicrosoftClientSecretCifrada?: string;
      oidcGoogleClientSecretCifrada?: string;
      cloudApiKeyCifrada?: string;
    };

    if (next.resetSmtpContrasena) {
      next.smtpContrasenaCifrada = undefined;
    }

    if (next.smtpContrasena && next.smtpContrasena !== '************') {
      next.smtpContrasenaCifrada = this.secretsService.encryptString(
        next.smtpContrasena,
      );
    }
    delete next.smtpContrasena;
    delete next.resetSmtpContrasena;

    if (next.resetCorreoApiKey) {
      next.correoApiKeyCifrada = undefined;
    }

    if (next.correoApiKey && next.correoApiKey !== '************') {
      next.correoApiKeyCifrada = this.secretsService.encryptString(
        next.correoApiKey,
      );
    }
    delete next.correoApiKey;
    delete next.resetCorreoApiKey;

    if (next.resetAlmacenamientoNubeSecret) {
      next.almacenamientoNubeSecretCifrada = undefined;
    }

    if (
      next.almacenamientoNubeSecret &&
      next.almacenamientoNubeSecret !== '************'
    ) {
      next.almacenamientoNubeSecretCifrada = this.secretsService.encryptString(
        next.almacenamientoNubeSecret,
      );
    }
    delete next.almacenamientoNubeSecret;
    delete next.resetAlmacenamientoNubeSecret;

    if (next.oidcMicrosoftClientSecret && next.oidcMicrosoftClientSecret !== '************') {
      next.oidcMicrosoftClientSecretCifrada = this.secretsService.encryptString(next.oidcMicrosoftClientSecret);
    }
    delete next.oidcMicrosoftClientSecret;

    if (next.oidcGoogleClientSecret && next.oidcGoogleClientSecret !== '************') {
      next.oidcGoogleClientSecretCifrada = this.secretsService.encryptString(next.oidcGoogleClientSecret);
    }
    delete next.oidcGoogleClientSecret;

    if (next.cloudApiKey && next.cloudApiKey !== '************') {
      next.cloudApiKeyCifrada = this.secretsService.encryptString(next.cloudApiKey);
    }
    delete next.cloudApiKey;

    return next;
  }

  private sanitize(payload: ConfiguracionOperativaTenant) {
    return {
      ...payload,
      ...this.getInstallationMode(),
      smtpContrasena: payload.smtpContrasenaCifrada ? '************' : undefined,
      smtpContrasenaConfigurada: !!payload.smtpContrasenaCifrada,
      correoApiKey: payload.correoApiKeyCifrada ? '************' : undefined,
      correoApiKeyConfigurada: !!payload.correoApiKeyCifrada,
      almacenamientoNubeSecret: payload.almacenamientoNubeSecretCifrada
        ? '************'
        : undefined,
      almacenamientoNubeSecretConfigurada:
        !!payload.almacenamientoNubeSecretCifrada,
      oidcMicrosoftClientSecret: payload.oidcMicrosoftClientSecretCifrada
        ? '************'
        : undefined,
      oidcMicrosoftClientSecretConfigurado:
        !!payload.oidcMicrosoftClientSecretCifrada,
      oidcGoogleClientSecret: payload.oidcGoogleClientSecretCifrada
        ? '************'
        : undefined,
      oidcGoogleClientSecretConfigurado:
        !!payload.oidcGoogleClientSecretCifrada,
      cloudApiKey: payload.cloudApiKeyCifrada ? '************' : undefined,
      cloudApiKeyConfigurada: !!payload.cloudApiKeyCifrada,
    };
  }

  private async persistCorreoProbeResult(
    config: ConfiguracionOperativaTenant,
    actorId: string,
    result: { ok: boolean; detail?: string },
  ) {
    config.correoUltimaPruebaAt = new Date();
    config.correoUltimaPruebaEstado = result.ok ? 'ok' : 'error';
    config.correoUltimaPruebaDetalle = result.detail;
    config.correoUltimaPruebaActorId = actorId;
    await this.repository.save(config);
  }

  private async persistStorageProbeResult(
    config: ConfiguracionOperativaTenant,
    actorId: string,
    result: { ok: boolean; detail?: string },
  ) {
    config.almacenamientoUltimaPruebaAt = new Date();
    config.almacenamientoUltimaPruebaEstado = result.ok ? 'ok' : 'error';
    config.almacenamientoUltimaPruebaDetalle = result.detail;
    config.almacenamientoUltimaPruebaActorId = actorId;
    await this.repository.save(config);
  }

  private async probeLocalStorage(
    config: ConfiguracionOperativaTenant,
    started: number,
  ) {
    const basePath = config.almacenamientoRutaLocal?.trim();
    if (!basePath) {
      return {
        ok: false,
        mode: 'local',
        responseTimeMs: Date.now() - started,
        detail: 'Falta ruta local de almacenamiento.',
      };
    }

    const rootPath = resolve(basePath);
    const probeDir = join(rootPath, '.healthcheck');
    const probeFile = join(probeDir, `probe-${Date.now()}.tmp`);
    const probeContent = `SGCAET_STORAGE_PROBE_${Date.now()}`;

    try {
      await fs.mkdir(probeDir, { recursive: true });
      await fs.writeFile(probeFile, probeContent, 'utf8');
      const readBack = await fs.readFile(probeFile, 'utf8');
      if (readBack !== probeContent) {
        throw new Error('contenido inconsistente en lectura');
      }
      await fs.unlink(probeFile);
      return {
        ok: true,
        mode: 'local',
        responseTimeMs: Date.now() - started,
        detail: `Write/read/delete local OK en ${probeDir}`,
      };
    } catch (error) {
      await fs.unlink(probeFile).catch(() => undefined);
      return {
        ok: false,
        mode: 'local',
        responseTimeMs: Date.now() - started,
        detail:
          error instanceof Error
            ? `Fallo probe local: ${error.message}`
            : 'Fallo probe local de almacenamiento',
      };
    }
  }

  private buildCorreoApiHeaders(config: {
    authHeader: string;
    authPrefix: string;
    apiKey: string;
  }) {
    const token = config.authPrefix
      ? `${config.authPrefix.trim()} ${config.apiKey}`.trim()
      : config.apiKey;
    return {
      'Content-Type': 'application/json',
      [config.authHeader]: token,
    };
  }
}
