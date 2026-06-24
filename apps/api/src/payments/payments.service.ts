import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, PaymentStatus, Prisma } from '@prisma/client';
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
  ) {}

  async create(dto: CreatePaymentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.cancelled) {
      throw new BadRequestException('Cannot post payment to a cancelled invoice');
    }

    if (Number(dto.amount) > Number(invoice.balance)) {
      throw new BadRequestException('Payment amount cannot exceed invoice balance');
    }

    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    const payment = await this.prisma.payment.create({
      data: {
        paymentNumber: await this.nextPaymentNumber(),
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
      include: this.includeRelations(),
    });

    await this.recalculateInvoice(invoice.id, payment.id);
    return payment;
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
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: current.invoiceId, deletedAt: null },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.cancelled && dto.status !== PaymentStatus.voided) {
      throw new BadRequestException('Cannot update payment for a cancelled invoice');
    }

    if (dto.amount !== undefined && dto.status !== PaymentStatus.voided) {
      const postedTotal = await this.postedTotalForInvoice(
        current.invoiceId,
        current.id,
      );
      if (Number(postedTotal) + Number(dto.amount) > Number(invoice.total)) {
        throw new BadRequestException('Payment amount cannot exceed invoice balance');
      }
    }

    const collectorAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.collectorUserId,
      STAFF_ROLES.COLLECTOR,
    );

    const updated = await this.prisma.payment.update({
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
      include: this.includeRelations(),
    });

    await this.recalculateInvoice(current.invoiceId);
    return updated;
  }

  async void(id: number) {
    await this.findOne(id);
    return this.update(id, { status: PaymentStatus.voided });
  }

  async remove(id: number) {
    const current = await this.findOne(id);

    const deleted = await this.prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.voided,
        deletedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.recalculateInvoice(current.invoiceId);
    return deleted;
  }

  private async postedTotalForInvoice(invoiceId: number, excludePaymentId?: number) {
    const aggregate = await this.prisma.payment.aggregate({
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

  private async recalculateInvoice(invoiceId: number, paymentId?: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return;

    const previousStatus = invoice.status;
    const amountPaid = await this.postedTotalForInvoice(invoiceId);
    const balance = Prisma.Decimal.max(
      new Prisma.Decimal(0),
      invoice.total.minus(amountPaid),
    );
    const status =
      balance.equals(0) && amountPaid.greaterThan(0)
        ? InvoiceStatus.paid
        : amountPaid.greaterThan(0)
          ? InvoiceStatus.partially_paid
          : invoice.status === InvoiceStatus.draft
            ? InvoiceStatus.draft
            : InvoiceStatus.issued;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid,
        balance,
        status,
      },
    });

    if (
      status === InvoiceStatus.paid &&
      previousStatus !== InvoiceStatus.paid
    ) {
      await this.pppoeAccountsService.restoreAfterPayment(invoiceId, paymentId);
    }
  }

  private async nextPaymentNumber() {
    const now = new Date();
    const prefix = `PAY-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const count = await this.prisma.payment.count({
      where: { paymentNumber: { startsWith: prefix } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
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
