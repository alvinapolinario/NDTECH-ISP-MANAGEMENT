import { Module } from '@nestjs/common';
import { InstallationRequestsController } from './installation-requests.controller';
import { InstallationRequestsService } from './installation-requests.service';

@Module({
  controllers: [InstallationRequestsController],
  providers: [InstallationRequestsService],
})
export class InstallationRequestsModule {}
