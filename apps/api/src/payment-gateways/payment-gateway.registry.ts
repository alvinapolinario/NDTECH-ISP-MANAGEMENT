import { Injectable } from '@nestjs/common';
import { PaymongoProvider } from './providers/paymongo.provider';
import { StubPaymentGatewayProvider } from './providers/stub.provider';
import {
  PaymentGatewayProvider,
  PaymentGatewayProviderId,
  PaymentGatewayProviderInfo,
} from './providers/payment-gateway.types';

@Injectable()
export class PaymentGatewayRegistry {
  private readonly providers: Map<
    PaymentGatewayProviderId,
    PaymentGatewayProvider
  >;

  constructor(private readonly paymongoProvider: PaymongoProvider) {
    this.providers = new Map([
      ['paymongo', paymongoProvider],
      [
        'stripe',
        new StubPaymentGatewayProvider(
          'stripe',
          'Stripe',
          'International card payments via Stripe Checkout (coming soon).',
        ),
      ],
      [
        'gcash',
        new StubPaymentGatewayProvider(
          'gcash',
          'GCash Direct',
          'Direct GCash merchant API integration (coming soon). PayMongo already supports GCash checkout.',
        ),
      ],
      [
        'maya',
        new StubPaymentGatewayProvider(
          'maya',
          'Maya',
          'Direct Maya merchant API integration (coming soon). PayMongo already supports Maya checkout.',
        ),
      ],
    ]);
  }

  get(providerId: PaymentGatewayProviderId): PaymentGatewayProvider {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Unknown payment gateway provider: ${providerId}`);
    }

    return provider;
  }

  list(): PaymentGatewayProvider[] {
    return Array.from(this.providers.values());
  }

  async listInfo(): Promise<PaymentGatewayProviderInfo[]> {
    return Promise.all(
      this.list().map(async (provider) => ({
        id: provider.id,
        label: provider.label,
        description: provider.description,
        configured: await provider.isConfigured(),
        supported: provider.id === 'paymongo',
      })),
    );
  }
}
