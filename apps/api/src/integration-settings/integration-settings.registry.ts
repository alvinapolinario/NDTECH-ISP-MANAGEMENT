export type IntegrationSettingType = 'secret' | 'text' | 'boolean';

export type IntegrationSettingDefinition = {
  key: string;
  label: string;
  description: string;
  category: 'sms' | 'email' | 'general' | 'payments';
  type: IntegrationSettingType;
  envFallback?: string;
  placeholder?: string;
};

export const INTEGRATION_SETTING_DEFINITIONS: IntegrationSettingDefinition[] = [
  {
    key: 'semaphore.api_key',
    label: 'Semaphore API Key',
    description: 'API key from your Semaphore account dashboard.',
    category: 'sms',
    type: 'secret',
    envFallback: 'SEMAPHORE_API_KEY',
    placeholder: 'Paste Semaphore API key',
  },
  {
    key: 'semaphore.sender_name',
    label: 'Semaphore Sender Name',
    description: 'Registered sender name shown to SMS recipients.',
    category: 'sms',
    type: 'text',
    envFallback: 'SEMAPHORE_SENDER_NAME',
    placeholder: 'NDTECH',
  },
  {
    key: 'sms.enabled',
    label: 'SMS Enabled',
    description: 'Turn outbound SMS sending on or off.',
    category: 'sms',
    type: 'boolean',
    envFallback: 'SMS_ENABLED',
  },
  {
    key: 'paymongo.secret_key',
    label: 'PayMongo Secret Key',
    description: 'Server-side secret key (sk_test_ or sk_live_) for creating checkout links.',
    category: 'payments',
    type: 'secret',
    envFallback: 'PAYMONGO_SECRET_KEY',
    placeholder: 'sk_test_...',
  },
  {
    key: 'paymongo.public_key',
    label: 'PayMongo Public Key',
    description: 'Public key (pk_test_ or pk_live_) for client-side integrations.',
    category: 'payments',
    type: 'secret',
    envFallback: 'PAYMONGO_PUBLIC_KEY',
    placeholder: 'pk_test_...',
  },
  {
    key: 'paymongo.webhook_secret',
    label: 'PayMongo Webhook Secret',
    description: 'Signing secret from PayMongo webhook endpoint settings.',
    category: 'payments',
    type: 'secret',
    envFallback: 'PAYMONGO_WEBHOOK_SECRET',
    placeholder: 'whsec_...',
  },
  {
    key: 'paymongo.enabled',
    label: 'PayMongo Enabled',
    description: 'Allow creating PayMongo checkout links for invoices.',
    category: 'payments',
    type: 'boolean',
    envFallback: 'PAYMONGO_ENABLED',
  },
  {
    key: 'payment_gateway.default',
    label: 'Default Payment Gateway',
    description: 'Default provider when creating checkout (paymongo, stripe, gcash, maya).',
    category: 'payments',
    type: 'text',
    envFallback: 'PAYMENT_GATEWAY_DEFAULT',
    placeholder: 'paymongo',
  },
];

export const INTEGRATION_SETTING_MAP = new Map(
  INTEGRATION_SETTING_DEFINITIONS.map((definition) => [
    definition.key,
    definition,
  ]),
);

export function maskSecretValue(value: string) {
  if (!value) return '';
  if (value.length <= 4) return '••••';
  return `••••${value.slice(-4)}`;
}
