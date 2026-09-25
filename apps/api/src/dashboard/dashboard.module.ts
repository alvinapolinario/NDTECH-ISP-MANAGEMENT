import { Module } from '@nestjs/common';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [MikrotikModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
