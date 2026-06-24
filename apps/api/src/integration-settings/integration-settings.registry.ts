export type IntegrationSettingType = 'secret' | 'text' | 'boolean';

export type IntegrationSettingDefinition = {
  key: string;
  label: string;
  description: string;
  category: 'sms' | 'email' | 'general';
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
