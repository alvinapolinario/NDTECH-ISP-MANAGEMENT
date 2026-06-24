import { Module } from '@nestjs/common';
import { BillingCyclesController } from './billing-cycles.controller';
import { BillingCyclesService } from './billing-cycles.service';

@Module({
  controllers: [BillingCyclesController],
  providers: [BillingCyclesService],
})
export class BillingCyclesModule {}
