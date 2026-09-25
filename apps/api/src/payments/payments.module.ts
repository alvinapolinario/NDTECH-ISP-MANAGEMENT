import { Module } from '@nestjs/common';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [MikrotikModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
