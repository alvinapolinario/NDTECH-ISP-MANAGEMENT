import { Module } from '@nestjs/common';
import { NetworkMonitoringController } from './network-monitoring.controller';
import { NetworkMonitoringService } from './network-monitoring.service';

@Module({
  controllers: [NetworkMonitoringController],
  providers: [NetworkMonitoringService],
})
export class NetworkMonitoringModule {}
