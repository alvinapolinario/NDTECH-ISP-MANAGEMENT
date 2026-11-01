import { Module } from '@nestjs/common';
import { IntegrationSettingsModule } from '../integration-settings/integration-settings.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentGatewayRegistry } from './payment-gateway.registry';
import { PaymentGatewaysController } from './payment-gateways.controller';
import { PaymentGatewaysService } from './payment-gateways.service';
import { PaymentGatewaysWebhooksController } from './payment-gateways.webhooks.controller';
import { PaymongoProvider } from './providers/paymongo.provider';

@Module({
  imports: [PaymentsModule, IntegrationSettingsModule],
  controllers: [PaymentGatewaysController, PaymentGatewaysWebhooksController],
  providers: [PaymentGatewaysService, PaymentGatewayRegistry, PaymongoProvider],
  exports: [PaymentGatewaysService],
})
export class PaymentGatewaysModule {}
