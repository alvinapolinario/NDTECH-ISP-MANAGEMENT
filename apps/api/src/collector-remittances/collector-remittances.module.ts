import { Module } from '@nestjs/common';
import { CollectorRemittancesController } from './collector-remittances.controller';
import { CollectorRemittancesService } from './collector-remittances.service';

@Module({
  controllers: [CollectorRemittancesController],
  providers: [CollectorRemittancesService],
  exports: [CollectorRemittancesService],
})
export class CollectorRemittancesModule {}
