import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AcknowledgeNetworkAlertDto } from './dto/acknowledge-network-alert.dto';
import { CreateNetworkAlertDto } from './dto/create-network-alert.dto';
import { ListNetworkAlertsQueryDto } from './dto/list-network-alerts-query.dto';
import { ResolveNetworkAlertDto } from './dto/resolve-network-alert.dto';
import { UpdateNetworkAlertDto } from './dto/update-network-alert.dto';
import { NetworkAlertsService } from './network-alerts.service';

@Controller('network-alerts')
export class NetworkAlertsController {
  constructor(private readonly networkAlertsService: NetworkAlertsService) {}

  @Post()
  create(@Body() dto: CreateNetworkAlertDto) {
    return this.networkAlertsService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListNetworkAlertsQueryDto) {
    return this.networkAlertsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.networkAlertsService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateNetworkAlertDto) {
    return this.networkAlertsService.update(Number(id), dto);
  }

  @Post(':id/acknowledge')
  acknowledge(@Param('id') id: string, @Body() dto: AcknowledgeNetworkAlertDto) {
    return this.networkAlertsService.acknowledge(Number(id), dto);
  }

  @Post(':id/resolve')
  resolve(@Param('id') id: string, @Body() dto: ResolveNetworkAlertDto) {
    return this.networkAlertsService.resolve(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.networkAlertsService.remove(Number(id));
  }
}
