import { Module } from '@nestjs/common';
import { OnuDevicesModule } from '../onu-devices/onu-devices.module';
import { Tr069Controller } from './tr069.controller';
import { Tr069Service } from './tr069.service';

@Module({
  imports: [OnuDevicesModule],
  controllers: [Tr069Controller],
  providers: [Tr069Service],
  exports: [Tr069Service],
})
export class Tr069Module {}
