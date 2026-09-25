import { Module } from '@nestjs/common';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { RadiusModule } from '../radius/radius.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [MikrotikModule, RadiusModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
