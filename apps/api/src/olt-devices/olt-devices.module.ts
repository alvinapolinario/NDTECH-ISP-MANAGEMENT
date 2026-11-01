import { Module } from '@nestjs/common';
import { SnmpModule } from '../snmp/snmp.module';
import { OltDevicesController } from './olt-devices.controller';
import { OltDevicesService } from './olt-devices.service';
import { OltDevicesSnmpService } from './olt-devices-snmp.service';

@Module({
  imports: [SnmpModule],
  controllers: [OltDevicesController],
  providers: [OltDevicesService, OltDevicesSnmpService],
  exports: [OltDevicesSnmpService],
})
export class OltDevicesModule {}
