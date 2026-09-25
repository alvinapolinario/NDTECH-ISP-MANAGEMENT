import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InvoiceStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { InvoiceLedgerService } from '../billing/invoice-ledger.service';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PppoeAccountsService } from '../mikrotik/pppoe-accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pppoeAccountsService: PppoeAccountsService,
    private readonly invoiceLedger: InvoiceLedgerService,
  ) {}

  async create(dto: CreatePaymentDto) {
    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    if (
      dto.paymentMethod === PaymentMethod.cash &&
      !(collectorAssignment?.userId ?? dto.collectorUserId)
    ) {
      throw new BadRequestException('Cash payments require a collector');
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      await this.invoiceLedger.lockInvoice(tx, dto.invoiceId);

      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, deletedAt: null },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.cancelled) {
        throw new BadRequestException(
          'Cannot post payment to a cancelled invoice',
        );
      }

      const ledger = await this.invoiceLedger.recalculate(invoice.id, {
        client: tx,
      });
      const balance = ledger?.balance ?? invoice.balance;

      if (Number(dto.amount) > Number(balance)) {
        throw new BadRequestException(
          'Payment amount cannot exceed invoice balance',
        );
      }

      const created = await tx.payment.create({
        data: {
          paymentNumber: await this.nextPaymentNumber(tx),
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: dto.amount,
          paymentDate: new Date(dto.paymentDate),
          paymentMethod: dto.paymentMethod,
          referenceNumber: dto.referenceNumber,
          receivedBy:
            collectorAssignment === undefined
              ? dto.receivedBy
              : collectorAssignment.name,
          collectorUserId:
            collectorAssignment === undefined
              ? dto.collectorUserId
              : collectorAssignment.userId,
          notes: dto.notes,
        },
      });

      const after = await this.invoiceLedger.recalculate(invoice.id, {
        client: tx,
      });

      return { created, after };
    });

    if (
      payment.after?.status === InvoiceStatus.paid &&
      payment.after.previousStatus !== InvoiceStatus.paid
    ) {
      await this.pppoeAccountsService.restoreAfterPayment(
        payment.created.invoiceId,
        payment.created.id,
      );
    }

    return this.findOne(payment.created.id);
  }

  async createFromGateway(params: {
    invoiceId: number;
    amount: number;
    paymentMethod: PaymentMethod;
    referenceNumber: string;
    notes?: string;
  }) {
    const payment = await this.prisma.$transaction(async (tx) => {
      await this.invoiceLedger.lockInvoice(tx, params.invoiceId);

      const invoice = await tx.invoice.findFirst({
        where: { id: params.invoiceId, deletedAt: null },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (invoice.status === InvoiceStatus.cancelled) {
        throw new BadRequestException(
          'Cannot post payment to a cancelled invoice',
        );
      }

      const ledger = await this.invoiceLedger.recalculate(invoice.id, {
        client: tx,
      });
      const balance = ledger?.balance ?? invoice.balance;

      if (params.amount > Number(balance)) {
        throw new BadRequestException(
          'Payment amount cannot exceed invoice balance',
        );
      }

      const created = await tx.payment.create({
        data: {
          paymentNumber: await this.nextPaymentNumber(tx),
          invoiceId: invoice.id,
          customerId: invoice.customerId,
          amount: params.amount,
          paymentDate: new Date(),
          paymentMethod: params.paymentMethod,
          referenceNumber: params.referenceNumber,
          receivedBy: 'Online payment gateway',
          notes: params.notes,
        },
      });

      const after = await this.invoiceLedger.recalculate(invoice.id, {
        client: tx,
      });

      return { created, after };
    });

    if (
      payment.after?.status === InvoiceStatus.paid &&
      payment.after.previousStatus !== InvoiceStatus.paid
    ) {
      await this.pppoeAccountsService.restoreAfterPayment(
        payment.created.invoiceId,
        payment.created.id,
      );
    }

    return this.findOne(payment.created.id);
  }

  async findAll(query: ListPaymentsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as PaymentStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.paymentMethod ? { paymentMethod: query.paymentMethod } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.subscriptionId
        ? { invoice: { subscriptionId: query.subscriptionId } }
        : {}),
      ...(search
        ? {
            OR: [
              { paymentNumber: { contains: search } },
              { referenceNumber: { contains: search } },
              { receivedBy: { contains: search } },
              { collector: { name: { contains: search } } },
              { collector: { email: { contains: search } } },
              { notes: { contains: search } },
              { invoice: { invoiceNumber: { contains: search } } },
              {
                customer: {
                  OR: [
                    { firstName: { contains: search } },
                    { lastName: { contains: search } },
                    { businessName: { contains: search } },
                    { accountNumber: { contains: search } },
                  ],
                },
              },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }

  async update(id: number, dto: UpdatePaymentDto) {
    const current = await this.findOne(id);

    if (
      dto.paymentMethod === PaymentMethod.cash ||
      (dto.paymentMethod === undefined &&
        current.paymentMethod === PaymentMethod.cash)
    ) {
      const nextCollectorId =
        dto.collectorUserId !== undefined
          ? dto.collectorUserId
          : current.collectorUserId;
      if (!nextCollectorId) {
        throw new BadRequestException('Cash payments require a collector');
      }
    }

    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.invoiceLedger.lockInvoice(tx, current.invoiceId);

      const invoice = await tx.invoice.findFirst({
        where: { id: current.invoiceId, deletedAt: null },
      });

      if (!invoice) {
        throw new NotFoundException('Invoice not found');
      }

      if (
        invoice.status === InvoiceStatus.cancelled &&
        dto.status !== PaymentStatus.voided
      ) {
        throw new BadRequestException(
          'Cannot update payment for a cancelled invoice',
        );
      }

      if (dto.amount !== undefined && dto.status !== PaymentStatus.voided) {
        const postedTotal = await this.invoiceLedger.sumPostedPayments(
          tx,
          current.invoiceId,
          current.id,
        );
        const ledger = await this.invoiceLedger.recalculate(current.invoiceId, {
          client: tx,
        });
        const maxTotal = ledger?.total ?? invoice.total;
        if (Number(postedTotal) + Number(dto.amount) > Number(maxTotal)) {
          throw new BadRequestException(
            'Payment amount cannot exceed invoice total after adjustments',
          );
        }
      }

      const row = await tx.payment.update({
        where: { id },
        data: {
          amount: dto.amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : undefined,
          paymentMethod: dto.paymentMethod,
          status: dto.status,
          referenceNumber: dto.referenceNumber,
          ...(collectorAssignment !== undefined
            ? {
                collectorUserId: collectorAssignment.userId,
                receivedBy: collectorAssignment.name,
              }
            : { receivedBy: dto.receivedBy }),
          notes: dto.notes,
        },
      });

      const after = await this.invoiceLedger.recalculate(current.invoiceId, {
        client: tx,
      });

      return { row, after };
    });

    if (
      updated.after?.status === InvoiceStatus.paid &&
      updated.after.previousStatus !== InvoiceStatus.paid
    ) {
      await this.pppoeAccountsService.restoreAfterPayment(
        current.invoiceId,
        updated.row.id,
      );
    }

    return this.findOne(updated.row.id);
  }

  async void(id: number) {
    await this.findOne(id);
    return this.update(id, { status: PaymentStatus.voided });
  }

  async remove(id: number) {
    const current = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      await this.invoiceLedger.lockInvoice(tx, current.invoiceId);
      const row = await tx.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.voided,
          deletedAt: new Date(),
        },
        include: this.includeRelations(),
      });
      await this.invoiceLedger.recalculate(current.invoiceId, { client: tx });
      return row;
    });
  }

  private async nextPaymentNumber(client: Prisma.TransactionClient | PrismaService) {
    const now = new Date();
    const prefix = `PAY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const count = await client.payment.count({
        where: { paymentNumber: { startsWith: prefix } },
      });
      const candidate = `${prefix}-${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await client.payment.findUnique({
        where: { paymentNumber: candidate },
        select: { id: true },
      });
      if (!exists) {
        return candidate;
      }
    }

    return `${prefix}-${Date.now()}`;
  }

  private includeRelations() {
    return {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          total: true,
          amountPaid: true,
          balance: true,
          status: true,
          dueDate: true,
          billingCycle: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          accountNumber: true,
          firstName: true,
          lastName: true,
          businessName: true,
          mobileNumber: true,
          email: true,
          status: true,
        },
      },
      collector: {
        select: {
          id: true,
          name: true,
          email: true,
          mobileNumber: true,
        },
      },
    };
  }
}
