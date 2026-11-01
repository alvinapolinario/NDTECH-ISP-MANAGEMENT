import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { RequireRoles, RolesGuard } from '../common/roles.guard';
import { STAFF_ROLES } from '../common/staff-role';
import { ReportQueryDto } from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('subscribers')
  subscribers(@Query() query: ReportQueryDto) {
    return this.reportsService.subscribers(query);
  }

  @Get('billing')
  @RequireRoles(STAFF_ROLES.FINANCE)
  billing(@Query() query: ReportQueryDto) {
    return this.reportsService.billing(query);
  }

  @Get('collections')
  @RequireRoles(STAFF_ROLES.FINANCE, STAFF_ROLES.COLLECTOR)
  collections(@Query() query: ReportQueryDto) {
    return this.reportsService.collections(query);
  }

  @Get('collections/by-collector')
  @RequireRoles(STAFF_ROLES.FINANCE)
  collectionsByCollector(@Query() query: ReportQueryDto) {
    return this.reportsService.collectionsByCollector(query);
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
