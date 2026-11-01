import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateOltDeviceDto } from './dto/create-olt-device.dto';
import { ListOltDevicesQueryDto } from './dto/list-olt-devices-query.dto';
import { UpdateOltDeviceDto } from './dto/update-olt-device.dto';
import { OltDevicesService } from './olt-devices.service';
import { OltDevicesSnmpService } from './olt-devices-snmp.service';

@Controller('olt-devices')
export class OltDevicesController {
  constructor(
    private readonly oltDevicesService: OltDevicesService,
    private readonly oltDevicesSnmpService: OltDevicesSnmpService,
  ) {}

  @Post()
  create(@Body() dto: CreateOltDeviceDto) {
    return this.oltDevicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListOltDevicesQueryDto) {
    return this.oltDevicesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.oltDevicesService.findOne(Number(id));
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOltDeviceDto) {
    return this.oltDevicesService.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.oltDevicesService.remove(Number(id));
  }

  @Post(':id/test-snmp')
  testSnmp(@Param('id') id: string) {
    return this.oltDevicesSnmpService.testSnmp(Number(id));
  }

  @Post(':id/poll')
  poll(@Param('id') id: string) {
    return this.oltDevicesSnmpService.pollDevice(Number(id), { syncOnus: true });
  }
}
