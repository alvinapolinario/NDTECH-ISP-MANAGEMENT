import { Controller, Get, Query } from '@nestjs/common';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('subscribers')
  subscribers(@Query() query: ReportQueryDto) {
    return this.reportsService.subscribers(query);
  }

  @Get('billing')
  billing(@Query() query: ReportQueryDto) {
    return this.reportsService.billing(query);
  }

  @Get('collections')
  collections(@Query() query: ReportQueryDto) {
    return this.reportsService.collections(query);
  }

  @Get('referrals')
  referrals(@Query() query: ReportQueryDto) {
    return this.reportsService.referrals(query);
  }

  @Get('network')
  network(@Query() query: ReportQueryDto) {
    return this.reportsService.network(query);
  }

  @Get('inventory')
  inventory(@Query() query: ReportQueryDto) {
    return this.reportsService.inventory(query);
  }

  @Get('projects')
  projects(@Query() query: ReportQueryDto) {
    return this.reportsService.projects(query);
  }
}
