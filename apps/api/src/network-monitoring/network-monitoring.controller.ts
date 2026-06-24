import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateNetworkMonitoringTargetDto } from './dto/create-network-monitoring-target.dto';
import { ListNetworkMonitoringTargetsQueryDto } from './dto/list-network-monitoring-targets-query.dto';
import { RecordNetworkMonitoringCheckDto } from './dto/record-network-monitoring-check.dto';
import { UpdateNetworkMonitoringTargetDto } from './dto/update-network-monitoring-target.dto';
import { NetworkMonitoringService } from './network-monitoring.service';

@Controller('network-monitoring')
export class NetworkMonitoringController {
  constructor(private readonly networkMonitoringService: NetworkMonitoringService) {}

  @Post()
  create(@Body() dto: CreateNetworkMonitoringTargetDto) {
    return this.networkMonitoringService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListNetworkMonitoringTargetsQueryDto) {
    return this.networkMonitoringService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.networkMonitoringService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNetworkMonitoringTargetDto) {
    return this.networkMonitoringService.update(Number(id), dto);
  }

  @Post(':id/checks')
  recordCheck(@Param('id') id: string, @Body() dto: RecordNetworkMonitoringCheckDto) {
    return this.networkMonitoringService.recordCheck(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.networkMonitoringService.remove(Number(id));
  }
}
