import { Module } from '@nestjs/common';
import { SnmpClientService } from './snmp-client.service';
import { SnmpPollingService } from './snmp-polling.service';

@Module({
  providers: [SnmpClientService, SnmpPollingService],
  exports: [SnmpClientService, SnmpPollingService],
})
export class SnmpModule {}
