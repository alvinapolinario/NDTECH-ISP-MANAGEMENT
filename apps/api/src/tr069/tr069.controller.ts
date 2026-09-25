import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ChangeOnuPppoeDto } from './dto/change-onu-pppoe.dto';
import { ChangeOnuWifiPasswordDto } from './dto/change-onu-wifi-password.dto';
import { ChangeOnuWifiSsidDto } from './dto/change-onu-wifi-ssid.dto';
import { LookupTr069BySerialQueryDto } from './dto/lookup-tr069-by-serial-query.dto';
import { Tr069Service } from './tr069.service';

@Controller('onu-devices')
export class Tr069Controller {
  constructor(private readonly tr069: Tr069Service) {}

  @Get('tr069/config')
  getConfig() {
    return this.tr069.getConfig();
  }

  @Get('tr069/lookup')
  lookupBySerial(@Query() query: LookupTr069BySerialQueryDto) {
    return this.tr069.lookupBySerial(query.serial);
  }

  @Get(':id/tr069/status')
  getStatus(@Param('id') id: string) {
    return this.tr069.getOnuTr069Status(Number(id));
  }

  @Post(':id/tr069/wifi-ssid')
  setWifiSsid(@Param('id') id: string, @Body() dto: ChangeOnuWifiSsidDto) {
    return this.tr069.setWifiSsid(Number(id), dto.ssid, dto.ssid5g);
  }

  @Post(':id/tr069/wifi-password')
  setWifiPassword(@Param('id') id: string, @Body() dto: ChangeOnuWifiPasswordDto) {
    return this.tr069.setWifiPassword(Number(id), dto.password);
  }

  @Post(':id/tr069/pppoe')
  setPppoe(@Param('id') id: string, @Body() dto: ChangeOnuPppoeDto) {
    return this.tr069.setPppoeCredentials(Number(id), dto.username, dto.password);
  }

  @Post(':id/tr069/reboot')
  reboot(@Param('id') id: string) {
    return this.tr069.rebootOnu(Number(id));
  }

  @Post(':id/tr069/refresh')
  refresh(@Param('id') id: string) {
    return this.tr069.refreshOnu(Number(id));
  }
}
