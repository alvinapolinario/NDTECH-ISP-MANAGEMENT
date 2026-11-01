import {
  BadRequestException,
  Injectable,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SecretCryptoService } from '../mikrotik/crypto/secret-crypto.service';
import {
  INTEGRATION_SETTING_DEFINITIONS,
  INTEGRATION_SETTING_MAP,
  IntegrationSettingDefinition,
  maskSecretValue,
} from './integration-settings.registry';
import { UpdateIntegrationSettingsDto } from './dto/update-integration-settings.dto';

export type IntegrationSettingView = IntegrationSettingDefinition & {
  configured: boolean;
  value?: string;
  maskedValue?: string;
  source: 'database' | 'environment' | 'default';
  updatedAt?: string;
};

@Injectable()
export class IntegrationSettingsService implements OnModuleInit {
  private cache = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly secretCrypto: SecretCryptoService,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async listSettings(): Promise<IntegrationSettingView[]> {
    const rows = await this.prisma.integrationSetting.findMany();
    const rowMap = new Map(rows.map((row) => [row.key, row]));

    return INTEGRATION_SETTING_DEFINITIONS.map((definition) => {
      const row = rowMap.get(definition.key);
      const envValue = definition.envFallback
        ? this.config.get<string>(definition.envFallback)?.trim()
        : undefined;

      if (definition.type === 'secret') {
        const configured = Boolean(row?.valueEncrypted || envValue);
        return {
          ...definition,
          configured,
          maskedValue: row?.valueEncrypted
            ? maskSecretValue(this.decryptSafe(row.valueEncrypted))
            : envValue
              ? maskSecretValue(envValue)
              : undefined,
          source: row?.valueEncrypted
            ? 'database'
            : envValue
              ? 'environment'
              : 'default',
          updatedAt: row?.updatedAt.toISOString(),
        };
      }

      const dbValue = row?.valuePlain ?? undefined;
      const resolved = dbValue ?? envValue ?? this.defaultValue(definition);
      const configured = Boolean(dbValue || envValue);

      return {
        ...definition,
        configured,
        value: resolved,
        source: dbValue ? 'database' : envValue ? 'environment' : 'default',
        updatedAt: row?.updatedAt.toISOString(),
      };
    });
  }

  async updateSettings(
    dto: UpdateIntegrationSettingsDto,
    updatedByUserId?: number,
  ) {
    for (const item of dto.settings) {
      const definition = INTEGRATION_SETTING_MAP.get(item.key);
      if (!definition) {
        throw new BadRequestException(`Unknown setting key: ${item.key}`);
      }

      if (item.value === undefined) {
        continue;
      }

      if (definition.type === 'secret') {
        const trimmed = item.value.trim();
        if (!trimmed) {
          continue;
        }

        await this.prisma.integrationSetting.upsert({
          where: { key: item.key },
          create: {
            key: item.key,
            valueEncrypted: this.secretCrypto.encrypt(trimmed),
            updatedByUserId,
          },
          update: {
            valueEncrypted: this.secretCrypto.encrypt(trimmed),
            updatedByUserId,
          },
        });
        this.cache.set(item.key, trimmed);
        continue;
      }

      const normalized = this.normalizePlainValue(definition, item.value);

      await this.prisma.integrationSetting.upsert({
        where: { key: item.key },
        create: {
          key: item.key,
          valuePlain: normalized,
          updatedByUserId,
        },
        update: {
          valuePlain: normalized,
          updatedByUserId,
        },
      });
      this.cache.set(item.key, normalized);
    }

    await this.refreshCache();
    return this.listSettings();
  }

  async getSecret(key: string) {
    const definition = INTEGRATION_SETTING_MAP.get(key);
    if (!definition || definition.type !== 'secret') {
      throw new BadRequestException(`Unknown secret setting: ${key}`);
    }

    const cached = this.cache.get(key);
    if (cached) return cached;

    const row = await this.prisma.integrationSetting.findUnique({
      where: { key },
    });

    if (row?.valueEncrypted) {
      const plainText = this.secretCrypto.decrypt(row.valueEncrypted);
      this.cache.set(key, plainText);
      return plainText;
    }

    const envValue = definition.envFallback
      ? this.config.get<string>(definition.envFallback)?.trim()
      : undefined;

    return envValue || '';
  }

  async getPlain(key: string) {
    const definition = INTEGRATION_SETTING_MAP.get(key);
    if (!definition || definition.type === 'secret') {
      throw new BadRequestException(`Unknown plain setting: ${key}`);
    }

    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;

    const row = await this.prisma.integrationSetting.findUnique({
      where: { key },
    });

    if (row?.valuePlain !== null && row?.valuePlain !== undefined) {
      this.cache.set(key, row.valuePlain);
      return row.valuePlain;
    }

    const envValue = definition.envFallback
      ? this.config.get<string>(definition.envFallback)?.trim()
      : undefined;

    if (envValue) return envValue;
    return this.defaultValue(definition);
  }

  async getBoolean(key: string, fallback = true) {
    const value = await this.getPlain(key);
    if (!value) return fallback;
    return value.toLowerCase() !== 'false';
  }

  async getSmsConfig() {
    const [apiKey, senderName, enabled] = await Promise.all([
      this.getSecret('semaphore.api_key'),
      this.getPlain('semaphore.sender_name'),
      this.getBoolean('sms.enabled', true),
    ]);

    return {
      apiKey,
      senderName,
      enabled,
    };
  }

  async getPaymongoConfig() {
    const [secretKey, publicKey, webhookSecret, enabled] = await Promise.all([
      this.getSecret('paymongo.secret_key'),
      this.getSecret('paymongo.public_key'),
      this.getSecret('paymongo.webhook_secret'),
      this.getBoolean('paymongo.enabled', false),
    ]);

    return {
      secretKey,
      publicKey,
      webhookSecret,
      enabled,
    };
  }

  private async refreshCache() {
    this.cache.clear();
    const rows = await this.prisma.integrationSetting.findMany();

    for (const row of rows) {
      const definition = INTEGRATION_SETTING_MAP.get(row.key);
      if (!definition) continue;

      if (definition.type === 'secret' && row.valueEncrypted) {
        this.cache.set(row.key, this.secretCrypto.decrypt(row.valueEncrypted));
      } else if (row.valuePlain !== null && row.valuePlain !== undefined) {
        this.cache.set(row.key, row.valuePlain);
      }
    }
  }

  private defaultValue(definition: IntegrationSettingDefinition) {
    if (definition.type === 'boolean') {
      return 'true';
    }

    return '';
  }

  private normalizePlainValue(
    definition: IntegrationSettingDefinition,
    value: string,
  ) {
    const trimmed = value.trim();

    if (definition.type === 'boolean') {
      return ['true', '1', 'yes', 'on'].includes(trimmed.toLowerCase())
        ? 'true'
        : 'false';
    }

    return trimmed;
  }

  private decryptSafe(payload: string) {
    try {
      return this.secretCrypto.decrypt(payload);
    } catch {
      return '';
    }
  }
}
