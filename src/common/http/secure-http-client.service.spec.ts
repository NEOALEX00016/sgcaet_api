import { ConfigService } from '@nestjs/config';
import { SecureHttpClientService } from './secure-http-client.service';

describe('SecureHttpClientService', () => {
  const configServiceMock = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'OUTBOUND_TIMEOUT_MS') return '12000';
      if (key === 'OUTBOUND_ALLOWLIST') return '';
      return fallback;
    }),
  } as unknown as ConfigService;

  const service = new SecureHttpClientService(configServiceMock);
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('rejects non-HTTPS destinations', async () => {
    await expect(
      service.request({
        url: 'http://example.com/personas',
        allowedHosts: ['example.com'],
      }),
    ).rejects.toThrow('Solo se permiten destinos HTTPS');
  });

  it('rejects localhost and private network targets', async () => {
    await expect(
      service.request({
        url: 'https://127.0.0.1/private',
        allowedHosts: ['127.0.0.1'],
      }),
    ).rejects.toThrow('IPv4 privada/reservada no permitida');

    await expect(
      service.request({
        url: 'https://169.254.169.254/latest/meta-data',
        allowedHosts: ['169.254.169.254'],
      }),
    ).rejects.toThrow('Host no seguro bloqueado');

    await expect(
      service.request({
        url: 'https://192.168.1.20/health',
        allowedHosts: ['192.168.1.20'],
      }),
    ).rejects.toThrow('IPv4 privada/reservada no permitida');
  });

  it('rejects hosts outside allowlist', async () => {
    await expect(
      service.request({
        url: 'https://api.evil.test/personas',
        allowedHosts: ['api.allowed.test'],
      }),
    ).rejects.toThrow('Host externo no permitido por allowlist');
  });

  it('blocks redirects and allows valid JSON responses', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 302,
        text: jest.fn().mockResolvedValue(''),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: jest.fn().mockResolvedValue('{"ok":true}'),
      } as unknown as Response);

    await expect(
      service.request({
        url: 'https://api.allowed.test/redirect',
        allowedHosts: ['api.allowed.test'],
      }),
    ).rejects.toThrow('Redireccion externa no permitida');

    const response = await service.request({
      url: 'https://api.allowed.test/personas',
      allowedHosts: ['api.allowed.test'],
    });
    expect(response.ok).toBe(true);
    expect(response.status).toBe(200);
    expect(response.jsonValid).toBe(true);
    expect(response.json).toEqual({ ok: true });
  });
});
