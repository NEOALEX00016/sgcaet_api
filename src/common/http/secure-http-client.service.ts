import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isIP } from 'node:net';

export type SecureHttpRequestOptions = {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  allowedHosts?: string[];
};

export type SecureHttpResponse = {
  ok: boolean;
  status: number;
  responseTimeMs: number;
  text: string;
  json: unknown;
  jsonValid: boolean;
  finalUrl: string;
};

@Injectable()
export class SecureHttpClientService {
  constructor(private readonly configService: ConfigService) {}

  extractHostname(rawUrl: string | null | undefined): string | null {
    if (!rawUrl?.trim()) return null;
    try {
      return new URL(rawUrl).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  async request(options: SecureHttpRequestOptions): Promise<SecureHttpResponse> {
    const allowedHosts = this.resolveAllowedHosts(options.allowedHosts);
    const parsedUrl = this.validateUrl(options.url, allowedHosts);
    const timeoutMs = this.resolveTimeout(options.timeoutMs);

    const started = Date.now();
    const response = await fetch(parsedUrl.toString(), {
      method: options.method ?? 'GET',
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'manual',
    });
    const responseTimeMs = Date.now() - started;

    if (response.status >= 300 && response.status < 400) {
      throw new BadRequestException('Redireccion externa no permitida');
    }

    const text = await response.text();
    let json: unknown = null;
    let jsonValid = false;
    try {
      json = JSON.parse(text);
      jsonValid = true;
    } catch {
      jsonValid = false;
    }

    return {
      ok: response.ok,
      status: response.status,
      responseTimeMs,
      text,
      json,
      jsonValid,
      finalUrl: parsedUrl.toString(),
    };
  }

  private resolveTimeout(timeoutMs?: number) {
    const configured = Number(
      this.configService.get<string>('OUTBOUND_TIMEOUT_MS', '12000'),
    );
    const safeConfigured = Number.isFinite(configured) && configured > 0 ? configured : 12000;
    const requested = Number.isFinite(timeoutMs) && (timeoutMs as number) > 0 ? (timeoutMs as number) : safeConfigured;
    return Math.min(Math.max(requested, 1000), 30000);
  }

  private resolveAllowedHosts(explicit?: string[]) {
    const envRaw = this.configService.get<string>('OUTBOUND_ALLOWLIST', '');
    const envHosts = envRaw
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
    const localHosts = (explicit ?? [])
      .map((entry) => entry.trim().toLowerCase())
      .filter((entry) => entry.length > 0);
    const merged = [...new Set([...envHosts, ...localHosts])];
    if (!merged.length) {
      throw new BadRequestException(
        'No hay allowlist de salida configurada para llamada externa',
      );
    }
    return merged;
  }

  private validateUrl(rawUrl: string, allowlist: string[]) {
    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      throw new BadRequestException('URL externa invalida');
    }

    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('Solo se permiten destinos HTTPS');
    }
    if (parsed.username || parsed.password) {
      throw new BadRequestException('Credenciales en URL no permitidas');
    }

    const host = parsed.hostname.toLowerCase();
    this.rejectUnsafeHost(host);

    const allowed = allowlist.some((entry) => host === entry || host.endsWith(`.${entry}`));
    if (!allowed) {
      throw new BadRequestException(`Host externo no permitido por allowlist: ${host}`);
    }

    return parsed;
  }

  private rejectUnsafeHost(host: string) {
    const forbiddenHostnames = new Set([
      'localhost',
      'metadata.google.internal',
      '169.254.169.254',
      '0.0.0.0',
    ]);
    if (forbiddenHostnames.has(host)) {
      throw new BadRequestException(`Host no seguro bloqueado: ${host}`);
    }

    const ipVersion = isIP(host);
    if (!ipVersion) return;
    if (ipVersion === 4 && this.isPrivateOrReservedIpv4(host)) {
      throw new BadRequestException(`IPv4 privada/reservada no permitida: ${host}`);
    }
    if (ipVersion === 6 && this.isPrivateOrReservedIpv6(host)) {
      throw new BadRequestException(`IPv6 privada/reservada no permitida: ${host}`);
    }
  }

  private isPrivateOrReservedIpv4(ip: string) {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a >= 224) return true;
    return false;
  }

  private isPrivateOrReservedIpv6(ip: string) {
    const normalized = ip.toLowerCase();
    if (normalized === '::1' || normalized === '::') return true;
    if (normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb')) return true;
    if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;
    return false;
  }
}
