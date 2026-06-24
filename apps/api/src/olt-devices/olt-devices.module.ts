import { Module } from '@nestjs/common';
import { OltDevicesController } from './olt-devices.controller';
import { OltDevicesService } from './olt-devices.service';

@Module({
  controllers: [OltDevicesController],
  providers: [OltDevicesService],
})
export class OltDevicesModule {}
