import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateOnuDeviceDto } from './dto/create-onu-device.dto';
import { ListOnuDevicesQueryDto } from './dto/list-onu-devices-query.dto';
import { OnuDevicesService } from './onu-devices.service';
import { UpdateOnuDeviceDto } from './dto/update-onu-device.dto';

@Controller('onu-devices')
export class OnuDevicesController {
  constructor(private readonly onuDevicesService: OnuDevicesService) {}

  @Post()
  create(@Body() dto: CreateOnuDeviceDto) {
    return this.onuDevicesService.create(dto);
  }

  @Get()
  findAll(@Query() query: ListOnuDevicesQueryDto) {
    return this.onuDevicesService.findAll(query);
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
}
