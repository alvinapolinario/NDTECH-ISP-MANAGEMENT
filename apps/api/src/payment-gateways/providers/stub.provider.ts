import { BadGatewayException } from '@nestjs/common';
import type { PaymentGatewayProviderId } from './payment-gateway.types';
import {
  GatewayCheckoutRequest,
  GatewayCheckoutResult,
  GatewayWebhookContext,
  GatewayWebhookEvent,
  PaymentGatewayProvider,
} from './payment-gateway.types';

export class StubPaymentGatewayProvider implements PaymentGatewayProvider {
  constructor(
    readonly id: PaymentGatewayProviderId,
    readonly label: string,
    readonly description: string,
  ) {}

  async isConfigured(): Promise<boolean> {
    return false;
  }

  async createCheckout(_request: GatewayCheckoutRequest): Promise<GatewayCheckoutResult> {
    throw new BadGatewayException(
      `${this.label} integration is not configured yet. Add provider credentials in integration settings.`,
    );
  }

  verifyWebhook(_context: GatewayWebhookContext): Promise<boolean> {
    return Promise.resolve(false);
  }

  parseWebhook(_rawBody: Buffer): GatewayWebhookEvent | null {
    return null;
  }
}
