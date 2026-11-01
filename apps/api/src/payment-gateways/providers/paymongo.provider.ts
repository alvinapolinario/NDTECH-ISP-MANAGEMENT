import {
  BadGatewayException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { IntegrationSettingsService } from '../../integration-settings/integration-settings.service';
import {
  GatewayCheckoutRequest,
  GatewayCheckoutResult,
  GatewayWebhookContext,
  GatewayWebhookEvent,
  PaymentGatewayProvider,
} from './payment-gateway.types';

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

type PayMongoEnvelope<T> = {
  data?: {
    id?: string;
    attributes?: T;
  };
};

type PayMongoLinkAttributes = {
  amount?: number;
  checkout_url?: string;
  status?: string;
  reference_number?: string;
};

@Injectable()
export class PaymongoProvider implements PaymentGatewayProvider {
  readonly id = 'paymongo' as const;
  readonly label = 'PayMongo';
  readonly description =
    'Philippine payment gateway supporting GCash, Maya, cards, and more via hosted checkout links.';

  private readonly logger = new Logger(PaymongoProvider.name);

  constructor(
    private readonly integrationSettings: IntegrationSettingsService,
  ) {}

  async isConfigured(): Promise<boolean> {
    const config = await this.integrationSettings.getPaymongoConfig();
    return config.enabled && Boolean(config.secretKey);
  }

  async createCheckout(
    request: GatewayCheckoutRequest,
  ): Promise<GatewayCheckoutResult> {
    const config = await this.integrationSettings.getPaymongoConfig();

    if (!config.enabled) {
      throw new BadGatewayException('PayMongo integration is disabled');
    }

    if (!config.secretKey) {
      throw new BadGatewayException('PayMongo secret key is not configured');
    }

    const amountCentavos = Math.round(request.amount * 100);
    if (amountCentavos < 100) {
      throw new BadGatewayException('Payment amount must be at least PHP 1.00');
    }

    const response = await fetch(`${PAYMONGO_API_BASE}/links`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.secretKey}:`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            amount: amountCentavos,
            description: request.description,
            remarks: request.invoiceNumber,
          },
        },
      }),
    });

    const payload = (await response.json()) as PayMongoEnvelope<PayMongoLinkAttributes> & {
      errors?: Array<{ detail?: string }>;
    };

    if (!response.ok) {
      const detail =
        payload.errors?.map((error) => error.detail).filter(Boolean).join('; ') ||
        `PayMongo API error (${response.status})`;
      this.logger.warn(`PayMongo link creation failed: ${detail}`);
      throw new BadGatewayException(detail);
    }

    const externalId = payload.data?.id;
    const checkoutUrl = payload.data?.attributes?.checkout_url;

    if (!externalId || !checkoutUrl) {
      throw new BadGatewayException('PayMongo returned an incomplete checkout response');
    }

    return {
      externalId,
      checkoutUrl,
      status: 'pending',
      rawResponse: payload,
    };
  }

  async verifyWebhook(context: GatewayWebhookContext): Promise<boolean> {
    const signatureHeader = context.signatureHeader?.trim();
    if (!signatureHeader) {
      throw new UnauthorizedException('Missing PayMongo-Signature header');
    }

    const webhookSecret = await this.integrationSettings.getSecret(
      'paymongo.webhook_secret',
    );
    if (!webhookSecret) {
      throw new UnauthorizedException('PayMongo webhook secret is not configured');
    }

    const parts = Object.fromEntries(
      signatureHeader.split(',').map((part) => {
        const [key, value] = part.split('=');
        return [key.trim(), value?.trim() ?? ''];
      }),
    );

    const timestamp = parts.t;
    const signature = parts.li || parts.te;

    if (!timestamp || !signature) {
      throw new UnauthorizedException('Invalid PayMongo-Signature header format');
    }

    const computed = createHmac('sha256', webhookSecret)
      .update(`${timestamp}.${context.rawBody.toString('utf8')}`)
      .digest('hex');

    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(computed, 'utf8');

    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
      throw new UnauthorizedException('Invalid PayMongo webhook signature');
    }

    return true;
  }

  parseWebhook(rawBody: Buffer): GatewayWebhookEvent | null {
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      data?: {
        attributes?: {
          type?: string;
          data?: {
            id?: string;
            attributes?: PayMongoLinkAttributes & {
              payments?: Array<{
                id?: string;
                attributes?: {
                  amount?: number;
                  source?: { type?: string };
                  paid_at?: number;
                };
              }>;
            };
          };
        };
      };
    };

    const eventType = payload.data?.attributes?.type;
    const resource = payload.data?.attributes?.data;

    if (!eventType || !resource?.id) {
      return null;
    }

    if (!eventType.endsWith('.paid')) {
      return null;
    }

    const payment = resource.attributes?.payments?.[0];
    const amountCentavos =
      payment?.attributes?.amount ?? resource.attributes?.amount;
    const channel = payment?.attributes?.source?.type;
    const paidAtUnix = payment?.attributes?.paid_at;

    return {
      eventType,
      externalId: resource.id,
      paymentExternalId: payment?.id,
      amount:
        amountCentavos !== undefined ? amountCentavos / 100 : undefined,
      currency: 'PHP',
      channel,
      paidAt: paidAtUnix ? new Date(paidAtUnix * 1000) : new Date(),
      rawEvent: payload,
    };
  }
}
