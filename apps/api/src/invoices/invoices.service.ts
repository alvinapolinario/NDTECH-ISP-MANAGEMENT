import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { ListInvoicesQueryDto } from './dto/list-invoices-query.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { computeInvoiceDatesForCycle } from './invoice-billing-dates';

@Injectable()
export class InvoicesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListInvoicesQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as InvoiceStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.billingCycleId ? { billingCycleId: query.billingCycleId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(query.subscriptionId ? { subscriptionId: query.subscriptionId } : {}),
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search } },
              { notes: { contains: search } },
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
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async update(id: number, dto: UpdateInvoiceDto) {
    const current = await this.findOne(id);

    if (current.status === InvoiceStatus.cancelled && dto.items?.length) {
      throw new BadRequestException(
        'Cannot edit line items on a cancelled invoice',
      );
    }

    if (dto.items !== undefined) {
      if (!dto.items.length) {
        throw new BadRequestException('Invoice must have at least one line item');
      }

      await this.replaceInvoiceItems(id, dto.items, current);
    }

    const refreshed = await this.findOne(id);
    const paidData =
      dto.status === InvoiceStatus.paid
        ? { amountPaid: refreshed.total, balance: 0 }
        : {};

    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: dto.status,
        notes: dto.notes,
        ...(financeAssignment !== undefined
          ? { assignedFinanceUserId: financeAssignment.userId }
          : {}),
        ...paidData,
      },
      include: this.includeRelations(),
    });
  }

  private async replaceInvoiceItems(
    invoiceId: number,
    items: UpdateInvoiceItemDto[],
    current: Awaited<ReturnType<InvoicesService['findOne']>>,
  ) {
    const amountPaid = new Prisma.Decimal(current.amountPaid);
    const normalizedItems = items.map((item) => {
      const quantity = new Prisma.Decimal(item.quantity);
      const unitPrice = new Prisma.Decimal(item.unitPrice);
      const amount = quantity.mul(unitPrice);

      return {
        invoiceId,
        servicePlanId:
          item.itemType === 'recurring_service'
            ? (item.servicePlanId ?? current.subscription?.servicePlan.id ?? null)
            : null,
        itemType: item.itemType,
        description: item.description.trim(),
        quantity,
        unitPrice,
        amount,
      };
    });

    const subtotal = normalizedItems.reduce(
      (sum, item) => sum.add(item.amount),
      new Prisma.Decimal(0),
    );
    const total = subtotal;
    const balance = Prisma.Decimal.max(
      total.sub(amountPaid),
      new Prisma.Decimal(0),
    );

    await this.prisma.$transaction([
      this.prisma.invoiceItem.deleteMany({ where: { invoiceId } }),
      this.prisma.invoiceItem.createMany({ data: normalizedItems }),
      this.prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotal,
          total,
          balance,
          ...(amountPaid.gt(0) && balance.gt(0)
            ? { status: InvoiceStatus.partially_paid }
            : balance.lte(0) && amountPaid.gt(0)
              ? { status: InvoiceStatus.paid }
              : {}),
        },
      }),
    ]);
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: this.includeRelations(),
    });
  }

  async generate(dto: GenerateInvoicesDto) {
    const cycle = await this.prisma.billingCycle.findFirst({
      where: { id: dto.billingCycleId, deletedAt: null },
    });

    if (!cycle) {
      throw new NotFoundException('Billing cycle not found');
    }

    if (cycle.status === 'cancelled') {
      throw new BadRequestException('Cannot generate invoices for a cancelled billing cycle');
    }

    const subscriptions = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.active,
        startDate: { lte: cycle.periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: cycle.periodStart } }],
        invoices: {
          none: {
            billingCycleId: cycle.id,
            deletedAt: null,
          },
        },
      },
      include: {
        customer: true,
        servicePlan: true,
      },
      orderBy: { id: 'asc' },
    });

    let created = 0;
    let skipped = 0;

    for (const subscription of subscriptions) {
      const invoiceDates = computeInvoiceDatesForCycle(
        {
          billingDay: subscription.billingDay,
          gracePeriodDays: subscription.gracePeriodDays,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
        cycle,
      );

      if (!invoiceDates) {
        skipped += 1;
        continue;
      }

      const invoiceNumber = await this.nextInvoiceNumber(cycle.periodStart);
      const amount = subscription.servicePlan.monthlyPrice;
      const status = dto.status ?? InvoiceStatus.issued;

      await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          billingCycleId: cycle.id,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          issueDate: invoiceDates.issueDate,
          dueDate: invoiceDates.dueDate,
          subtotal: amount,
          total: amount,
          balance: amount,
          status,
          items: {
            create: [
              {
                servicePlanId: subscription.servicePlanId,
                description: `${subscription.servicePlan.name} - ${cycle.name}`,
                quantity: 1,
                unitPrice: amount,
                amount,
              },
            ],
          },
        },
      });

      created += 1;
    }

    const activeSubscriptions = await this.prisma.subscription.count({
      where: {
        status: SubscriptionStatus.active,
        startDate: { lte: cycle.periodEnd },
        OR: [{ endDate: null }, { endDate: { gte: cycle.periodStart } }],
      },
    });
    skipped += Math.max(activeSubscriptions - subscriptions.length, 0);

    return {
      billingCycleId: cycle.id,
      created,
      skipped,
      message: 'Invoice generation completed',
    };
  }

  private async nextInvoiceNumber(periodStart: Date) {
    const year = periodStart.getFullYear();
    const month = String(periodStart.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}`;
    const count = await this.prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private includeRelations() {
    return {
      billingCycle: {
        select: {
          id: true,
          name: true,
          periodStart: true,
          periodEnd: true,
          dueDate: true,
          status: true,
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
      subscription: {
        select: {
          id: true,
          billingDay: true,
          status: true,
          servicePlan: {
            select: {
              id: true,
              code: true,
              name: true,
              monthlyPrice: true,
            },
          },
        },
      },
      items: {
        include: {
          servicePlan: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      assignedFinanceUser: {
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
