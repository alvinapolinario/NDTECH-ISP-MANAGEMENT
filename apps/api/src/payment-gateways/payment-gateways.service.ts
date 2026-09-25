import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentGatewayProvider,
  PaymentGatewayTransactionStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { getPagination } from '../common/pagination';
import { IntegrationSettingsService } from '../integration-settings/integration-settings.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGatewayCheckoutDto } from './dto/create-gateway-checkout.dto';
import { ListGatewayTransactionsQueryDto } from './dto/list-gateway-transactions-query.dto';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentGatewayProviderId } from './providers/payment-gateway.types';

@Injectable()
export class PaymentGatewaysService {
  private readonly logger = new Logger(PaymentGatewaysService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: PaymentGatewayRegistry,
    private readonly paymentsService: PaymentsService,
    private readonly integrationSettings: IntegrationSettingsService,
    private readonly config: ConfigService,
  ) {}

  listProviders() {
    return this.registry.listInfo();
  }

  async createCheckout(dto: CreateGatewayCheckoutDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, deletedAt: null },
      include: {
        customer: {
          select: {
            id: true,
            accountNumber: true,
            firstName: true,
            lastName: true,
            businessName: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.cancelled) {
      throw new BadRequestException('Cannot create checkout for a cancelled invoice');
    }

    if (invoice.status === InvoiceStatus.paid) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    if (invoice.status === InvoiceStatus.draft) {
      throw new BadRequestException('Issue the invoice before collecting online payment');
    }

    const amount = dto.amount ?? Number(invoice.balance);
    if (amount <= 0) {
      throw new BadRequestException('Invoice has no remaining balance');
    }

    if (amount > Number(invoice.balance)) {
      throw new BadRequestException('Checkout amount cannot exceed invoice balance');
    }

    const providerId = await this.resolveProvider(dto.provider);
    const provider = this.registry.get(providerId);

    const checkout = await provider.createCheckout({
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      amount,
      currency: 'PHP',
      description: `Invoice ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: invoice.id,
        customerId: invoice.customerId,
      },
    });

    const transaction = await this.prisma.paymentGatewayTransaction.create({
      data: {
        provider: providerId,
        externalId: checkout.externalId,
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        amount,
        currency: 'PHP',
        status: PaymentGatewayTransactionStatus.pending,
        checkoutUrl: checkout.checkoutUrl,
        expiresAt: checkout.expiresAt,
        metadata: {
          invoiceNumber: invoice.invoiceNumber,
          providerResponse: (checkout.rawResponse ?? null) as Prisma.InputJsonValue,
        },
      },
      include: this.includeRelations(),
    });

    return transaction;
  }

  async findAll(query: ListGatewayTransactionsQueryDto) {
    const { page, limit, skip } = getPagination(query);

    const where = {
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.paymentGatewayTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.paymentGatewayTransaction.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const transaction = await this.prisma.paymentGatewayTransaction.findUnique({
      where: { id },
      include: this.includeRelations(),
    });

    if (!transaction) {
      throw new NotFoundException('Payment gateway transaction not found');
    }

    return transaction;
  }

  async handleWebhook(
    providerId: PaymentGatewayProviderId,
    rawBody: Buffer,
    signatureHeader?: string,
  ) {
    const provider = this.registry.get(providerId);
    await provider.verifyWebhook({ rawBody, signatureHeader });

    const event = provider.parseWebhook(rawBody);
    if (!event) {
      return { received: true, handled: false };
    }

    const transaction = await this.prisma.paymentGatewayTransaction.findUnique({
      where: {
        provider_externalId: {
          provider: providerId,
          externalId: event.externalId,
        },
      },
    });

    if (!transaction) {
      this.logger.warn(
        `Webhook ${event.eventType} for unknown ${providerId} resource ${event.externalId}`,
      );
      return { received: true, handled: false };
    }

    const existingEvents = Array.isArray(transaction.webhookEvents)
      ? (transaction.webhookEvents as Prisma.JsonArray)
      : [];

    if (transaction.status === PaymentGatewayTransactionStatus.paid) {
      await this.prisma.paymentGatewayTransaction.update({
        where: { id: transaction.id },
        data: {
          webhookEvents: [...existingEvents, event.rawEvent as Prisma.InputJsonValue],
        },
      });
      return { received: true, handled: true, duplicate: true };
    }

    const amount = event.amount ?? Number(transaction.amount);
    const payment = await this.paymentsService.createFromGateway({
      invoiceId: transaction.invoiceId,
      amount,
      paymentMethod: this.mapChannelToPaymentMethod(event.channel),
      referenceNumber:
        event.paymentExternalId ?? `${providerId}:${event.externalId}`,
      notes: `Online payment via ${provider.label}${event.channel ? ` (${event.channel})` : ''}`,
    });

    await this.prisma.paymentGatewayTransaction.update({
      where: { id: transaction.id },
      data: {
        status: PaymentGatewayTransactionStatus.paid,
        paidAt: event.paidAt ?? new Date(),
        channel: event.channel,
        paymentId: payment.id,
        webhookEvents: [...existingEvents, event.rawEvent as Prisma.InputJsonValue],
      },
    });

    return { received: true, handled: true, paymentId: payment.id };
  }

  getWebhookUrl(provider: PaymentGatewayProviderId) {
    const baseUrl =
      this.config.get<string>('PAYMENT_GATEWAY_WEBHOOK_BASE_URL')?.replace(
        /\/$/,
        '',
      ) ?? '';

    if (!baseUrl) {
      return `/payment-gateways/webhooks/${provider}`;
    }

    return `${baseUrl}/payment-gateways/webhooks/${provider}`;
  }

  private async resolveProvider(
    requested?: PaymentGatewayProvider,
  ): Promise<PaymentGatewayProviderId> {
    const configuredDefault = await this.integrationSettings.getPlain(
      'payment_gateway.default',
    );
    const envDefault = this.config.get<string>('PAYMENT_GATEWAY_DEFAULT');
    const fallback = (envDefault || configuredDefault || 'paymongo').trim();

    const providerId = (requested ?? fallback) as PaymentGatewayProviderId;
    const allowed: PaymentGatewayProviderId[] = [
      'paymongo',
      'stripe',
      'gcash',
      'maya',
    ];

    if (!allowed.includes(providerId)) {
      throw new BadRequestException(`Unsupported payment gateway: ${providerId}`);
    }

    return providerId;
  }

  private mapChannelToPaymentMethod(channel?: string): PaymentMethod {
    const normalized = channel?.toLowerCase() ?? '';

    if (normalized.includes('gcash')) {
      return PaymentMethod.gcash;
    }

    if (
      normalized.includes('card') ||
      normalized.includes('visa') ||
      normalized.includes('mastercard')
    ) {
      return PaymentMethod.card;
    }

    if (
      normalized.includes('bank') ||
      normalized.includes('instapay') ||
      normalized.includes('pesonet')
    ) {
      return PaymentMethod.bank_transfer;
    }

    if (normalized.includes('maya') || normalized.includes('paymaya')) {
      return PaymentMethod.other;
    }

    return PaymentMethod.other;
  }

  private includeRelations() {
    return {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          balance: true,
          status: true,
        },
      },
      customer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
        },
      },
      payment: {
        select: {
          id: true,
          paymentNumber: true,
          amount: true,
          status: true,
        },
      },
    } satisfies Prisma.PaymentGatewayTransactionInclude;
  }
}
