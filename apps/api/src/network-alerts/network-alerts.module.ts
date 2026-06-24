import { Module } from '@nestjs/common';
import { NetworkAlertsController } from './network-alerts.controller';
import { NetworkAlertsService } from './network-alerts.service';

@Module({
  controllers: [NetworkAlertsController],
  providers: [NetworkAlertsService],
})
export class NetworkAlertsModule {}
