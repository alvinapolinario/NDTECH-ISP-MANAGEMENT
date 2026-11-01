import { Module } from '@nestjs/common';
import { OltDevicesModule } from '../olt-devices/olt-devices.module';
import { OnuDevicesController } from './onu-devices.controller';
import { OnuDevicesService } from './onu-devices.service';
import { OnuDevicesSnmpService } from './onu-devices-snmp.service';

@Module({
  imports: [OltDevicesModule],
  controllers: [OnuDevicesController],
  providers: [OnuDevicesService, OnuDevicesSnmpService],
  exports: [OnuDevicesService],
})
export class OnuDevicesModule {}
