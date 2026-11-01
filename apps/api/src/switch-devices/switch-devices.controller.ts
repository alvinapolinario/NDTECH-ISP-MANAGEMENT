import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateSwitchDeviceDto } from './dto/create-switch-device.dto';
import { ListSwitchDevicesQueryDto } from './dto/list-switch-devices-query.dto';
import { UpdateSwitchDeviceDto } from './dto/update-switch-device.dto';
import { SwitchDevicesService } from './switch-devices.service';
import { SwitchDevicesSnmpService } from './switch-devices-snmp.service';

@Controller('switch-devices')
export class SwitchDevicesController {
  constructor(
    private readonly switchDevicesService: SwitchDevicesService,
    private readonly switchDevicesSnmpService: SwitchDevicesSnmpService,
  ) {}

  @Post()
  create(@Body() dto: CreateSwitchDeviceDto) {
    return this.switchDevicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListSwitchDevicesQueryDto) {
    return this.switchDevicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.switchDevicesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSwitchDeviceDto) {
    return this.switchDevicesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.switchDevicesService.remove(Number(id));
  }

  @Post(':id/test-snmp')
  testSnmp(@Param('id') id: string) {
    return this.switchDevicesSnmpService.testSnmp(Number(id));
  }

  @Post(':id/poll')
  poll(@Param('id') id: string) {
    return this.switchDevicesSnmpService.pollDevice(Number(id));
  }
}
