import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentGatewayProvider } from '@prisma/client';
import { CreateGatewayCheckoutDto } from './dto/create-gateway-checkout.dto';
import { ListGatewayTransactionsQueryDto } from './dto/list-gateway-transactions-query.dto';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewayProviderId } from './providers/payment-gateway.types';

@Controller('payment-gateways')
export class PaymentGatewaysController {
  constructor(private readonly paymentGatewaysService: PaymentGatewaysService) {}

  @Get('providers')
  listProviders() {
    return this.paymentGatewaysService.listProviders();
  }

  @Get('webhook-url/:provider')
  getWebhookUrl(@Param('provider') provider: PaymentGatewayProvider) {
    return {
      provider,
      url: this.paymentGatewaysService.getWebhookUrl(
        provider as PaymentGatewayProviderId,
      ),
    };
  }

  @Post('checkout')
  createCheckout(@Body() dto: CreateGatewayCheckoutDto) {
    return this.paymentGatewaysService.createCheckout(dto);
  }

  @Get('transactions')
  findAll(@Query() query: ListGatewayTransactionsQueryDto) {
    return this.paymentGatewaysService.findAll(query);
  }

  @Get('transactions/:id')
  findOne(@Param('id') id: string) {
    return this.paymentGatewaysService.findOne(Number(id));
  }
}
