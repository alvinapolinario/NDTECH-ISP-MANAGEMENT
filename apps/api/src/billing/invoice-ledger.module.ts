import { Global, Module } from '@nestjs/common';
import { InvoiceLedgerService } from './invoice-ledger.service';

@Global()
@Module({
  providers: [InvoiceLedgerService],
  exports: [InvoiceLedgerService],
})
export class InvoiceLedgerModule {}
