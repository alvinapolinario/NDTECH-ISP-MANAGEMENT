import {
  Controller,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewayProviderId } from './providers/payment-gateway.types';

type RawBodyRequest = {
  rawBody?: Buffer;
  body?: unknown;
};

@Controller('payment-gateways/webhooks')
export class PaymentGatewaysWebhooksController {
  constructor(private readonly paymentGatewaysService: PaymentGatewaysService) {}

  @Public()
  @Post(':provider')
  async handleWebhook(
    @Param('provider') provider: string,
    @Headers('paymongo-signature') paymongoSignature: string | undefined,
    @Req() request: RawBodyRequest,
  ) {
    const providerId = provider as PaymentGatewayProviderId;
    const allowed: PaymentGatewayProviderId[] = [
      'paymongo',
      'stripe',
      'gcash',
      'maya',
    ];

    if (!allowed.includes(providerId)) {
      throw new UnauthorizedException('Unknown payment gateway webhook');
    }

    const rawBody =
      request.rawBody ??
      Buffer.from(
        typeof request.body === 'string'
          ? request.body
          : JSON.stringify(request.body ?? {}),
        'utf8',
      );

    return this.paymentGatewaysService.handleWebhook(
      providerId,
      rawBody,
      paymongoSignature,
    );
  }
}
