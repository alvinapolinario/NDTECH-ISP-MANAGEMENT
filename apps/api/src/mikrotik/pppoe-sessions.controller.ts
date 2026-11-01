import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ListPppoeSessionsQueryDto } from './dto/list-pppoe-sessions-query.dto';
import { PppoeSessionsService } from './pppoe-sessions.service';

@Controller('pppoe-sessions')
export class PppoeSessionsController {
  constructor(private readonly sessionsService: PppoeSessionsService) {}

  @Get('summary')
  getSummary() {
    return this.sessionsService.getOnlineSummary();
  }

  @Get('monitoring')
  getMonitoring(@Query('routerId') routerId: string) {
    return this.sessionsService.getMonitoring(Number(routerId));
  }

  @Get()
  findAll(@Query() query: ListPppoeSessionsQueryDto) {
    return this.sessionsService.findAll(query);
  }

  @Post('refresh/:routerId')
  refresh(@Param('routerId') routerId: string) {
    return this.sessionsService.refreshRouterSessions(Number(routerId));
  }
}
