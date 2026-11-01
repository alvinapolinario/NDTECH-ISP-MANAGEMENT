import { Module } from '@nestjs/common';
import { SnmpModule } from '../snmp/snmp.module';
import { SwitchDevicesController } from './switch-devices.controller';
import { SwitchDevicesService } from './switch-devices.service';
import { SwitchDevicesSnmpService } from './switch-devices-snmp.service';

@Module({
  imports: [SnmpModule],
  controllers: [SwitchDevicesController],
  providers: [SwitchDevicesService, SwitchDevicesSnmpService],
  exports: [SwitchDevicesSnmpService],
})
export class SwitchDevicesModule {}
