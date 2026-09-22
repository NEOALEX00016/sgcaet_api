import { ConfigService } from '@nestjs/config';
import { SecretsService } from './secrets.service';

describe('SecretsService', () => {
  const configService = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'SECRET_ENCRYPTION_KEY') return 'sgcaet-test-secret-key';
      if (key === 'SECRET_KEY_VERSION') return 'v1';
      return fallback;
    }),
  } as unknown as ConfigService;

  const service = new SecretsService(configService);

  it('encrypts and decrypts roundtrip values', () => {
    const encrypted = service.encryptString('super-secret-value');
    expect(encrypted).toMatch(/^enc:v1:/);
    expect(service.decryptString(encrypted)).toBe('super-secret-value');
  });

  it('keeps plaintext input compatible in decrypt', () => {
    expect(service.decryptString('plain-value')).toBe('plain-value');
  });
});
