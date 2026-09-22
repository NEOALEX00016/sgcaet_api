import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ENCRYPTED_PREFIX = 'enc';

@Injectable()
export class SecretsService {
  constructor(private readonly configService: ConfigService) {}

  encryptString(plain: string): string {
    const text = plain?.trim();
    if (!text) return plain;
    if (this.isEncrypted(text)) return text;

    const keyVersion = this.configService.get<string>('SECRET_KEY_VERSION', 'v1');
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.resolveKey(), iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTED_PREFIX,
      keyVersion,
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decryptString(payload: string): string {
    if (!payload) return payload;
    if (!this.isEncrypted(payload)) return payload;

    const parts = payload.split(':');
    if (parts.length !== 5) return payload;
    const [, , ivBase64, tagBase64, cipherBase64] = parts;

    try {
      const iv = Buffer.from(ivBase64, 'base64');
      const tag = Buffer.from(tagBase64, 'base64');
      const encrypted = Buffer.from(cipherBase64, 'base64');
      const decipher = createDecipheriv('aes-256-gcm', this.resolveKey(), iv);
      decipher.setAuthTag(tag);
      const plain = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString('utf8');
      return plain;
    } catch {
      return payload;
    }
  }

  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(`${ENCRYPTED_PREFIX}:`);
  }

  private resolveKey(): Buffer {
    const configured = this.configService.get<string>('SECRET_ENCRYPTION_KEY', 'sgcaet-local-dev-key');
    const maybeBase64 = Buffer.from(configured, 'base64');
    if (maybeBase64.length === 32 && maybeBase64.toString('base64') === configured) {
      return maybeBase64;
    }
    return createHash('sha256').update(configured, 'utf8').digest();
  }
}
