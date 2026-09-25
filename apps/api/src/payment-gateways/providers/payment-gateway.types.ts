export type PaymentGatewayProviderId =
  | 'paymongo'
  | 'stripe'
  | 'gcash'
  | 'maya';

export type GatewayCheckoutRequest = {
  invoiceId: number;
  invoiceNumber: string;
  customerId: number;
  amount: number;
  currency: string;
  description: string;
  metadata?: Record<string, unknown>;
};

export type GatewayCheckoutResult = {
  externalId: string;
  checkoutUrl: string;
  status: 'pending';
  rawResponse?: unknown;
  expiresAt?: Date;
};

export type GatewayWebhookContext = {
  rawBody: Buffer;
  signatureHeader?: string;
};

export type GatewayWebhookEvent = {
  eventType: string;
  externalId: string;
  paymentExternalId?: string;
  amount?: number;
  currency?: string;
  channel?: string;
  paidAt?: Date;
  rawEvent: unknown;
};

export type PaymentGatewayProviderInfo = {
  id: PaymentGatewayProviderId;
  label: string;
  description: string;
  configured: boolean;
  supported: boolean;
};

export interface PaymentGatewayProvider {
  readonly id: PaymentGatewayProviderId;
  readonly label: string;
  readonly description: string;
  isConfigured(): Promise<boolean>;
  createCheckout(request: GatewayCheckoutRequest): Promise<GatewayCheckoutResult>;
  verifyWebhook(context: GatewayWebhookContext): Promise<boolean>;
  parseWebhook(rawBody: Buffer): GatewayWebhookEvent | null;
}
