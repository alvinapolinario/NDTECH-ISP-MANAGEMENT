import { Module } from '@nestjs/common';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { CollectorSyncController } from './collector-sync.controller';
import { CollectorSyncService } from './collector-sync.service';

@Module({
  imports: [MikrotikModule],
  controllers: [CollectorSyncController],
  providers: [CollectorSyncService],
})
export class CollectorSyncModule {}
