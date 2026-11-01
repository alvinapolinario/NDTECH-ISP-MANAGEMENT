import { Injectable } from '@nestjs/common';
import {
  BillingAdjustmentStatus,
  BillingAdjustmentType,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type LedgerClient = Prisma.TransactionClient | PrismaService;

export type InvoiceLedgerResult = {
  previousStatus: InvoiceStatus;
  status: InvoiceStatus;
  total: Prisma.Decimal;
  amountPaid: Prisma.Decimal;
  balance: Prisma.Decimal;
};

@Injectable()
export class InvoiceLedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async lockInvoice(client: LedgerClient, invoiceId: number) {
    await client.$executeRaw`
      SELECT id FROM invoices
      WHERE id = ${invoiceId} AND deleted_at IS NULL
      FOR UPDATE
    `;
  }

  async sumPostedPayments(
    client: LedgerClient,
    invoiceId: number,
    excludePaymentId?: number,
  ) {
    const aggregate = await client.payment.aggregate({
      where: {
        invoiceId,
        status: PaymentStatus.posted,
        deletedAt: null,
        ...(excludePaymentId ? { id: { not: excludePaymentId } } : {}),
      },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? new Prisma.Decimal(0);
  }

  async sumPostedAdjustments(
    client: LedgerClient,
    invoiceId: number,
    adjustmentType: BillingAdjustmentType,
  ) {
    const aggregate = await client.billingAdjustment.aggregate({
      where: {
        invoiceId,
        adjustmentType,
        status: BillingAdjustmentStatus.posted,
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    return aggregate._sum.amount ?? new Prisma.Decimal(0);
  }

  /**
   * Recomputes total/balance/status from subtotal + adjustments − payments.
   * Preserves/reapplies overdue when balance remains and due date has passed.
   */
  async recalculate(
    invoiceId: number,
    options?: { client?: LedgerClient },
  ): Promise<InvoiceLedgerResult | null> {
    const client = options?.client ?? this.prisma;
    const invoice = await client.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice || invoice.deletedAt) {
      return null;
    }

    if (invoice.status === InvoiceStatus.cancelled) {
      return {
        previousStatus: invoice.status,
        status: invoice.status,
        total: invoice.total,
        amountPaid: invoice.amountPaid,
        balance: invoice.balance,
      };
    }

    const previousStatus = invoice.status;
    const [credits, charges, amountPaid] = await Promise.all([
      this.sumPostedAdjustments(
        client,
        invoiceId,
        BillingAdjustmentType.credit,
      ),
      this.sumPostedAdjustments(
        client,
        invoiceId,
        BillingAdjustmentType.charge,
      ),
      this.sumPostedPayments(client, invoiceId),
    ]);

    const total = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoice.subtotal.plus(charges).minus(credits),
    );
    const balance = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      total.minus(amountPaid),
    );

    let status: InvoiceStatus;
    if (balance.equals(0) && amountPaid.greaterThan(0)) {
      status = InvoiceStatus.paid;
    } else if (amountPaid.greaterThan(0)) {
      status = this.isPastDue(invoice.dueDate)
        ? InvoiceStatus.overdue
        : InvoiceStatus.partially_paid;
    } else if (invoice.status === InvoiceStatus.draft) {
      status = InvoiceStatus.draft;
    } else if (this.isPastDue(invoice.dueDate) && balance.greaterThan(0)) {
      status = InvoiceStatus.overdue;
    } else {
      status = InvoiceStatus.issued;
    }

    await client.invoice.update({
      where: { id: invoiceId },
      data: {
        total,
        amountPaid,
        balance,
        status,
      },
    });

    return {
      previousStatus,
      status,
      total,
      amountPaid,
      balance,
    };
  }

  private isPastDue(dueDate: Date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  }
}
