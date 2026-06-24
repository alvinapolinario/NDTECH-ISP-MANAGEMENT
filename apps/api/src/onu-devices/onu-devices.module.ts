import { Module } from '@nestjs/common';
import { OnuDevicesController } from './onu-devices.controller';
import { OnuDevicesService } from './onu-devices.service';

@Module({
  controllers: [OnuDevicesController],
  providers: [OnuDevicesService],
})
export class OnuDevicesModule {}
