import { Global, Module } from '@nestjs/common';
import { RadiusCoaService } from './radius-coa.service';
import { RadiusDbService } from './radius-db.service';
import { RadiusProfilesService } from './radius-profiles.service';
import { RadiusProvisionerService } from './radius-provisioner.service';
import { RadiusSessionMonitorService } from './radius-session-monitor.service';
import { RadiusSubscribersService } from './radius-subscribers.service';

@Global()
@Module({
  providers: [
    RadiusDbService,
    RadiusCoaService,
    RadiusProfilesService,
    RadiusProvisionerService,
    RadiusSubscribersService,
    RadiusSessionMonitorService,
  ],
  exports: [
    RadiusDbService,
    RadiusCoaService,
    RadiusProfilesService,
    RadiusProvisionerService,
    RadiusSubscribersService,
    RadiusSessionMonitorService,
  ],
})
export class RadiusModule {}
