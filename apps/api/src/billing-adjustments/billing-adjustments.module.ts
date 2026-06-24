import { Module } from '@nestjs/common';
import { BillingAdjustmentsController } from './billing-adjustments.controller';
import { BillingAdjustmentsService } from './billing-adjustments.service';

@Module({
  controllers: [BillingAdjustmentsController],
  providers: [BillingAdjustmentsService],
})
export class BillingAdjustmentsModule {}
