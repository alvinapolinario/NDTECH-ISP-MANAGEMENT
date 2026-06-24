import { BadRequestException, Injectable } from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const FALLBACK_KEY_SOURCES = [
  'change_this_mikrotik_secret',
  'change_this_secret',
] as const;

@Injectable()
export class SecretCryptoService {
  private deriveKey(source: string) {
    return createHash('sha256').update(source).digest();
  }

  private getPrimaryKeySource() {
    return (
      process.env.MIKROTIK_SECRET_KEY ??
      process.env.JWT_SECRET ??
      FALLBACK_KEY_SOURCES[0]
    );
  }

  private getKeySources() {
    const sources = [
      process.env.MIKROTIK_SECRET_KEY,
      process.env.JWT_SECRET,
      ...FALLBACK_KEY_SOURCES,
    ].filter((value): value is string => Boolean(value));

    return [...new Set(sources)];
  }

  encrypt(plainText: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      ALGORITHM,
      this.deriveKey(this.getPrimaryKeySource()),
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      iv.toString('base64'),
      tag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':');
  }

  decrypt(payload: string) {
    return this.decryptWithMigration(payload).plainText;
  }

  decryptWithMigration(payload: string) {
    if (!payload || payload.split(':').length !== 3) {
      throw new BadRequestException(
        'Stored router password is invalid. Edit the router and enter the password again.',
      );
    }

    const primaryKeySource = this.getPrimaryKeySource();
    let lastError: Error | undefined;

    for (const source of this.getKeySources()) {
      try {
        const plainText = this.decryptWithKey(payload, source);

        return {
          plainText,
          reencrypted:
            source === primaryKeySource ? undefined : this.encrypt(plainText),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw new BadRequestException(
      lastError?.message?.includes('unable to authenticate')
        ? 'Stored router password cannot be decrypted with the current secret keys. Edit the router and enter the password again.'
        : 'Stored router password is invalid. Edit the router and enter the password again.',
    );
  }

  private decryptWithKey(payload: string, keySource: string) {
    const [ivB64, tagB64, encryptedB64] = payload.split(':');
    const decipher = createDecipheriv(
      ALGORITHM,
      this.deriveKey(keySource),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));

    return Buffer.concat([
      decipher.update(Buffer.from(encryptedB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }
}
