import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardAnalyticsQueryDto } from './dto/dashboard-analytics-query.dto';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('analytics')
  getAnalytics(@Query() query: DashboardAnalyticsQueryDto) {
    return this.dashboardService.getAnalytics(query);
  }
}
