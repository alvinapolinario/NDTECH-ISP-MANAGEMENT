import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { OltDevicesModule } from '../olt-devices/olt-devices.module';
import { SwitchDevicesModule } from '../switch-devices/switch-devices.module';
import { SnmpSchedulerService } from '../snmp/snmp-scheduler.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    OltDevicesModule,
    SwitchDevicesModule,
  ],
  providers: [SnmpSchedulerService],
})
export class NetworkSnmpSchedulerModule {}
