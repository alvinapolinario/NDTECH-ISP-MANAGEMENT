import { Module } from '@nestjs/common';
import { IntegrationSettingsModule } from '../integration-settings/integration-settings.module';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';

@Module({
  imports: [IntegrationSettingsModule],
  controllers: [SmsController],
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
