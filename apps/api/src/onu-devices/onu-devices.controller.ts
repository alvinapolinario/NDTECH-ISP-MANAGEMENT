import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateOnuDeviceDto } from './dto/create-onu-device.dto';
import { ListOnuDevicesQueryDto } from './dto/list-onu-devices-query.dto';
import { OnuDevicesService } from './onu-devices.service';
import { UpdateOnuDeviceDto } from './dto/update-onu-device.dto';
import { OnuDevicesSnmpService } from './onu-devices-snmp.service';

@Controller('onu-devices')
export class OnuDevicesController {
  constructor(
    private readonly onuDevicesService: OnuDevicesService,
    private readonly onuDevicesSnmpService: OnuDevicesSnmpService,
  ) {}

  @Post()
  create(@Body() dto: CreateOnuDeviceDto) {
    return this.onuDevicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListOnuDevicesQueryDto) {
    return this.onuDevicesService.findAll(query);
  }

  @Get(':id/signal-logs')
  signalLogs(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.onuDevicesSnmpService.listSignalLogs(Number(id), limit ? Number(limit) : 50);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.onuDevicesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOnuDeviceDto) {
    return this.onuDevicesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.onuDevicesService.remove(Number(id));
  }

  @Post(':id/poll')
  poll(@Param('id') id: string) {
    return this.onuDevicesSnmpService.pollDevice(Number(id));
  }
}
