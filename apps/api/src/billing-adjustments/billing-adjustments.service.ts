import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BillingAdjustmentStatus, InvoiceStatus } from '@prisma/client';
import { InvoiceLedgerService } from '../billing/invoice-ledger.service';
import { getPagination } from '../common/pagination';
import { resolveStaffAssignment, STAFF_ROLES } from '../common/staff-role';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBillingAdjustmentDto } from './dto/create-billing-adjustment.dto';
import { ListBillingAdjustmentsQueryDto } from './dto/list-billing-adjustments-query.dto';
import { UpdateBillingAdjustmentDto } from './dto/update-billing-adjustment.dto';

@Injectable()
export class BillingAdjustmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceLedger: InvoiceLedgerService,
  ) {}

  async create(dto: CreateBillingAdjustmentDto) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, deletedAt: null },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status === InvoiceStatus.cancelled) {
      throw new BadRequestException('Cannot adjust a cancelled invoice');
    }

    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );

    const adjustment = await this.prisma.billingAdjustment.create({
      data: {
        adjustmentNumber: await this.nextAdjustmentNumber(),
        invoiceId: invoice.id,
        customerId: invoice.customerId,
        adjustmentType: dto.adjustmentType,
        amount: dto.amount,
        reason: dto.reason,
        adjustmentDate: new Date(dto.adjustmentDate),
        notes: dto.notes,
        assignedFinanceUserId:
          financeAssignment === undefined ? undefined : financeAssignment.userId,
      },
      include: this.includeRelations(),
    });

    await this.invoiceLedger.recalculate(invoice.id);
    return adjustment;
  }

  async findAll(query: ListBillingAdjustmentsQueryDto) {
    const { page, limit, skip } = getPagination(query);
    const status = query.status ?? (query.filter as BillingAdjustmentStatus | undefined);
    const search = query.search?.trim();

    const where = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(query.adjustmentType ? { adjustmentType: query.adjustmentType } : {}),
      ...(query.invoiceId ? { invoiceId: query.invoiceId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { adjustmentNumber: { contains: search } },
              { reason: { contains: search } },
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
      this.prisma.billingAdjustment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.includeRelations(),
      }),
      this.prisma.billingAdjustment.count({ where }),
    ]);

    return { items, meta: { total, page, limit } };
  }

  async findOne(id: number) {
    const adjustment = await this.prisma.billingAdjustment.findFirst({
      where: { id, deletedAt: null },
      include: this.includeRelations(),
    });

    if (!adjustment) throw new NotFoundException('Billing adjustment not found');
    return adjustment;
  }

  async update(id: number, dto: UpdateBillingAdjustmentDto) {
    const current = await this.findOne(id);
    const financeAssignment = await resolveStaffAssignment(
      this.prisma,
      dto.assignedFinanceUserId,
      STAFF_ROLES.FINANCE,
    );

    const updated = await this.prisma.billingAdjustment.update({
      where: { id },
      data: {
        adjustmentType: dto.adjustmentType,
        amount: dto.amount,
        reason: dto.reason,
        adjustmentDate: dto.adjustmentDate
          ? new Date(dto.adjustmentDate)
          : undefined,
        status: dto.status,
        notes: dto.notes,
        ...(financeAssignment !== undefined
          ? { assignedFinanceUserId: financeAssignment.userId }
          : {}),
      },
      include: this.includeRelations(),
    });

    await this.invoiceLedger.recalculate(current.invoiceId);
    return updated;
  }

  async void(id: number) {
    await this.findOne(id);
    return this.update(id, { status: BillingAdjustmentStatus.voided });
  }

  async remove(id: number) {
    const current = await this.findOne(id);
    const deleted = await this.prisma.billingAdjustment.update({
      where: { id },
      data: {
        status: BillingAdjustmentStatus.voided,
        deletedAt: new Date(),
      },
      include: this.includeRelations(),
    });

    await this.invoiceLedger.recalculate(current.invoiceId);
    return deleted;
  }

  private async nextAdjustmentNumber() {
    const now = new Date();
    const prefix = `ADJ-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const count = await this.prisma.billingAdjustment.count({
        where: { adjustmentNumber: { startsWith: prefix } },
      });
      const candidate = `${prefix}-${String(count + 1 + attempt).padStart(4, '0')}`;
      const exists = await this.prisma.billingAdjustment.findUnique({
        where: { adjustmentNumber: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
    }

    return `${prefix}-${Date.now()}`;
  }

  private includeRelations() {
    return {
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          subtotal: true,
          total: true,
          amountPaid: true,
          balance: true,
          status: true,
          dueDate: true,
          billingCycle: { select: { id: true, name: true } },
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
